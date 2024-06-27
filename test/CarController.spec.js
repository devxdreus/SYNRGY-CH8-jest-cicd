const { Op } = require("sequelize");
const CarController = require("../app/controllers/CarController");
const { CarAlreadyRentedError } = require("../app/errors");

jest.mock("sequelize", () => ({
  Op: {
    gte: jest.fn(),
    lte: jest.fn(),
  },
}));

describe("CarController", () => {
  let carController;
  let carModel;
  let userCarModel;
  let dayjs;

  beforeEach(() => {
    carModel = {
      findAll: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      findByPk: jest.fn(),
    };
    userCarModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    dayjs = jest.fn().mockReturnValue({
      add: jest.fn().mockReturnValue("2022-01-02"),
    });
    carController = new CarController({ carModel, userCarModel, dayjs });
  });

  describe("handleListCars", () => {
    it("should list cars with pagination", async () => {
      const req = {
        query: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      carModel.findAll.mockResolvedValue([]);
      carModel.count.mockResolvedValue(0);

      await carController.handleListCars(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        cars: [],
        meta: {
          pagination: expect.any(Object),
        },
      });
    });
  });

  describe("handleGetCar", () => {
    it("should get car details", async () => {
      const req = {
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const car = { id: 1, name: "Test Car" };
      carModel.findByPk.mockResolvedValue(car);

      await carController.handleGetCar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(car);
    });
  });

  describe("handleCreateCar", () => {
    it("should create a new car", async () => {
      const req = {
        body: {
          name: "Test Car",
          price: 1000,
          size: "medium",
          image: "test.jpg",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const newCar = {
        id: 1,
        name: "Test Car",
        price: 1000,
        size: "medium",
        image: "test.jpg",
        isCurrentlyRented: false,
      };
      carModel.create.mockResolvedValue(newCar);

      await carController.handleCreateCar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newCar);
    });

    it("should handle error during car creation", async () => {
      const req = {
        body: {
          name: "Test Car",
          price: 1000,
          size: "medium",
          image: "test.jpg",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const error = new Error("Creation Error");
      carModel.create.mockRejectedValue(error);

      await carController.handleCreateCar(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: error.name,
          message: error.message,
        },
      });
    });
  });

  describe("handleRentCar", () => {
    it("should rent a car", async () => {
      const req = {
        body: { rentStartedAt: "2022-01-01", rentEndedAt: null },
        user: { id: 1 },
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();
      const car = { id: 1, name: "Test Car" };
      const userCar = {
        userId: 1,
        carId: 1,
        rentStartedAt: "2022-01-01",
        rentEndedAt: "2022-01-02",
      };
      carModel.findByPk.mockResolvedValue(car);
      userCarModel.findOne.mockResolvedValue(null);
      userCarModel.create.mockResolvedValue(userCar);

      await carController.handleRentCar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(userCar);
    });

    it("should handle error when car is already rented", async () => {
      const req = {
        body: { rentStartedAt: "2022-01-01", rentEndedAt: "2022-01-02" },
        user: { id: 1 },
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();
      const car = { id: 1, name: "Test Car" };
      const activeRent = {
        id: 1,
        carId: 1,
        rentStartedAt: "2022-01-01",
        rentEndedAt: "2022-01-02",
      };
      carModel.findByPk.mockResolvedValue(car);
      userCarModel.findOne.mockResolvedValue(activeRent);

      await carController.handleRentCar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(new CarAlreadyRentedError(car));
    });
  });

  describe("handleUpdateCar", () => {
    it("should update car details", async () => {
      const req = {
        body: {
          name: "Updated Car",
          price: 1500,
          size: "large",
          image: "updated.jpg",
        },
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const car = {
        update: jest.fn().mockResolvedValue({
          id: 1,
          name: "Updated Car",
          price: 1500,
          size: "large",
          image: "updated.jpg",
          isCurrentlyRented: false,
        }),
      };
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      await carController.handleUpdateCar(req, res);

      console.log("res.status calls:", res.status.mock.calls);
      console.log("res.json calls:", res.json.mock.calls);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        name: "Updated Car",
        price: 1500,
        size: "large",
        image: "updated.jpg",
        isCurrentlyRented: false,
      });
    });

    it("should handle error during car update", async () => {
      const req = {
        body: {
          name: "Updated Car",
          price: 1500,
          size: "large",
          image: "updated.jpg",
        },
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const error = new Error("Update Error");
      const car = {
        update: jest.fn().mockRejectedValue(error),
      };
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      await carController.handleUpdateCar(req, res);

      console.log("res.status calls:", res.status.mock.calls);
      console.log("res.json calls:", res.json.mock.calls);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: error.name,
          message: error.message,
        },
      });
    });
  });

  describe("handleDeleteCar", () => {
    it("should delete a car", async () => {
      const req = {
        params: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
      carModel.destroy.mockResolvedValue(1);

      await carController.handleDeleteCar(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });
  });
});

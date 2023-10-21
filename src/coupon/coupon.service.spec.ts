import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, INestApplication } from '@nestjs/common';
import { Coupon } from '../entities/Coupon';
import { PlayerCoupon } from '../entities/PlayerCoupon';
import { Reward } from '../entities/Reward';
import { CouponService } from './coupon.service';
import { Repository } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';

describe('CouponService (e2e)', () => {
  let app: INestApplication<NestExpressApplication>;
  let couponService: CouponService;
  let couponRepository: Repository<Coupon>;
  let playerCouponRepository: Repository<PlayerCoupon>;
  let rewardRepository: Repository<Reward>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule(
      {},
    ).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const genericRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    couponRepository = genericRepository as never as Repository<Coupon>;
    playerCouponRepository =
      genericRepository as never as Repository<PlayerCoupon>;
    rewardRepository = genericRepository as never as Repository<Reward>;

    couponService = new CouponService(
      couponRepository,
      rewardRepository,
      playerCouponRepository,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('redeemCoupon', () => {
    it('should throw BadRequestException if reward does not exist', async () => {
      const playerId = 1;
      const rewardId = 1;

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce(undefined);

      await expect(
        couponService.redeemCoupon(playerId, rewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reward is not valid', async () => {
      const playerId = 1;
      const rewardId = 1;

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce({
        startDate: new Date(Date.now() + 8640000),
        endDate: new Date(),
        perDayLimit: 3,
        totalLimit: 21,
        name: 'test',
        id: 1,
      });

      await expect(
        couponService.redeemCoupon(playerId, rewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if player exceeds 7 days limits', async () => {
      const playerId = 1;
      const rewardId = 1;

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce({
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        perDayLimit: 3,
        totalLimit: 21,
        name: 'test',
        id: 1,
      });

      jest.spyOn(playerCouponRepository, 'count').mockResolvedValueOnce(21);

      await expect(
        couponService.redeemCoupon(playerId, rewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if player exceeds per day limits', async () => {
      const playerId = 1;
      const rewardId = 1;

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce({
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        perDayLimit: 3,
        totalLimit: 21,
        name: 'test',
        id: 1,
      });

      jest
        .spyOn(playerCouponRepository, 'count')
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      await expect(
        couponService.redeemCoupon(playerId, rewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon is already redeemed', async () => {
      const playerId = 1;
      const rewardId = 1;

      const reward = {
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        perDayLimit: 3,
        totalLimit: 21,
        name: 'test',
        id: 1,
      };

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce(reward);

      jest.spyOn(playerCouponRepository, 'count').mockResolvedValueOnce(0);

      jest.spyOn(playerCouponRepository, 'findOne').mockResolvedValueOnce({
        id: 1,
        player: { id: playerId, name: 'test' },
        coupon: { Reward: reward, id: 1, value: 'your_coupon_value_here' },
        redeemedAt: new Date(),
      });

      await expect(
        couponService.redeemCoupon(playerId, rewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create and return a new coupon', async () => {
      const playerId = 1;
      const rewardId = 1;

      const reward = {
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        perDayLimit: 3,
        totalLimit: 21,
        name: 'test',
        id: 1,
      };

      jest.spyOn(rewardRepository, 'findOne').mockResolvedValueOnce(reward);

      jest.spyOn(playerCouponRepository, 'count').mockResolvedValueOnce(0);

      jest
        .spyOn(playerCouponRepository, 'findOne')
        .mockResolvedValueOnce(undefined);

      const coupon = new Coupon();
      coupon.value = 'your_coupon_value_here';
      coupon.Reward = new Reward();
      coupon.Reward = reward;

      jest.spyOn(couponRepository, 'save').mockResolvedValueOnce(coupon);

      const playerCoupon = new PlayerCoupon();
      playerCoupon.player = { id: playerId, name: 'test' };
      playerCoupon.coupon = coupon;

      jest
        .spyOn(playerCouponRepository, 'save')
        .mockResolvedValueOnce(playerCoupon);

      const result = await couponService.redeemCoupon(playerId, rewardId);

      expect(result).toEqual(coupon);
    });
  });
});

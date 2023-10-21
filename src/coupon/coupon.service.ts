import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupon } from '../entities/Coupon';
import { PlayerCoupon } from '../entities/PlayerCoupon';
import { Reward } from '../entities/Reward';
import { Repository, MoreThan } from 'typeorm';
import { Player } from '../entities/Player';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
    @InjectRepository(PlayerCoupon)
    private readonly playerCouponRepository: Repository<PlayerCoupon>,
  ) {}

  /**
   * Redeems a coupon for a given player and reward.
   * @param playerId The ID of the player redeeming the coupon.
   * @param rewardId The ID of the reward being redeemed.
   * @returns A Promise that resolves to the redeemed Coupon object.
   * @throws BadRequestException if the reward is invalid, the player has exceeded coupon limits, or the coupon has already been redeemed.
   */
  async redeemCoupon(playerId: number, rewardId: number): Promise<Coupon> {
    // Retrieve the reward and playerCoupon details
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });

    // Check if the reward exists and is valid
    if (
      !reward ||
      reward.startDate > new Date() ||
      reward.endDate < new Date()
    ) {
      throw new BadRequestException('Invalid reward or reward date');
    }

    // Check if the player exceeds 7 days limits
    const playerCouponCount = await this.playerCouponRepository.count({
      where: {
        player: { id: playerId },
        redeemedAt: MoreThan(
          new Date(
            new Date(Date.now() - 7 * 86400 * 1000).setHours(0, 0, 0, 0),
          ),
        ),
      },
    });

    if (playerCouponCount >= 21)
      throw new BadRequestException('Player exceeded coupon total limits');

    // Check if the player exceeds per day limits
    const playerCouponCountToday = await this.playerCouponRepository.count({
      where: {
        player: { id: playerId },
        redeemedAt: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
      },
    });

    if (playerCouponCountToday >= 3)
      throw new BadRequestException('Player exceeded coupon per day limits');

    // Check if the coupon is already redeemed
    const existingCoupon = await this.playerCouponRepository.findOne({
      where: {
        coupon: { Reward: { id: rewardId } },
        player: { id: playerId },
      },
    });

    if (existingCoupon)
      throw new BadRequestException('Coupon already redeemed');

    // Create and save the new coupon
    const newCoupon = new Coupon();
    newCoupon.value = 'your_coupon_value_here';
    newCoupon.Reward = reward;
    await this.couponRepository.save(newCoupon);

    // Create and save the playerCoupon record
    const playerCoupon = new PlayerCoupon();
    playerCoupon.player = new Player();
    playerCoupon.player.id = playerId;
    playerCoupon.coupon = newCoupon;
    await this.playerCouponRepository.save(playerCoupon);

    return newCoupon;
  }
}

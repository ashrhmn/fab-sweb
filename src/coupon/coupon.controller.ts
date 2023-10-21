import { Body, Controller, ParseIntPipe, Post } from '@nestjs/common';
import { CouponService } from './coupon.service';

@Controller()
export class CouponController {
  constructor(private readonly couponService: CouponService) {}
  @Post('/redeem-coupon')
  redeemCoupon(
    @Body('playerId', ParseIntPipe) playerId: number,
    @Body('rewardId', ParseIntPipe) rewardId: number,
  ) {
    return this.couponService.redeemCoupon(playerId, rewardId);
  }
}

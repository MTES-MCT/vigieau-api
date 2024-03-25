import { Body, Controller, Post, Req } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './dto/create_subscription.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { plainToInstance } from 'class-transformer';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: "Abonnement email à une adresse" })
  @ApiResponse({
    status: 201,
    type: SubscriptionDto,
  })
  async create(
    @Req() req,
    @Body() createSubscriptionsDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDto> {
    return this.subscriptionsService.create(
      createSubscriptionsDto,
      req,
    );
  }
}

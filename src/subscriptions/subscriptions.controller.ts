import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './dto/create_subscription.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { plainToInstance } from 'class-transformer';
import JwtGuard from '../auth/jwt.guard';

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

  @UseGuards(JwtGuard)
  @Get('')
  @ApiOperation({ summary: "Retourne les abonnements d'un utilisateur" })
  getAll(@Req() req) {
    return this.subscriptionsService.getSubscriptionsByEmail(req.auth.email);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: "Suppression d'un abonnement" })
  remove(@Req() req, @Param('id') id: string) {
    return this.subscriptionsService.deleteSubscriptionById(id, req.auth.email)
  }

  @UseGuards(JwtGuard)
  @Delete('')
  @HttpCode(204)
  @ApiOperation({ summary: "Suppression de tout les abonnements d'un utilisateur" })
  removeAll(@Req() req) {
    return this.subscriptionsService.deleteSubscriptionByEmail(req.auth.email)
  }
}

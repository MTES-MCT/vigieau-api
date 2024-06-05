import { Controller, Param, Post } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { UsageDto } from '../zones/dto/usage.dto';

@Controller('usage')
@ApiExcludeController()
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post('feedback/:id')
  @ApiOperation({ summary: "Feedback d'un usage non compréhensible" })
  @ApiResponse({
    status: 201,
    type: UsageDto,
  })
  async feedback(@Param('id') usageId: string): Promise<any> {
    return this.usageService.feedback(+usageId);
  }
}

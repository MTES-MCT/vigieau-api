import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { UsageDto } from '../zones/dto/usage.dto';
import { UsageFeedbackDto } from './dto/usage_feedback.dto';
import { UsageFeedback } from './entities/usage_feedback.entity';

@Controller('usage')
@ApiExcludeController()
export class UsageController {
  constructor(private readonly usageService: UsageService) {
  }

  @Post('feedback/:id')
  @ApiOperation({ summary: 'Feedback d\'un usage non compréhensible' })
  @ApiResponse({
    status: 201,
    type: UsageDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usage non trouvé.',
  })
  async feedback(@Param('id', ParseIntPipe) usageId: number,
                 @Body() usageFeedback: UsageFeedbackDto): Promise<UsageFeedback> {
    return this.usageService.feedback(usageId, usageFeedback.feedback?.trim());
  }
}

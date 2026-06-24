import { Body, Controller, HttpCode, Post, UsePipes } from '@nestjs/common';
import { waitlistSchema, type WaitlistEntryDto, type WaitlistInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { JoinWaitlistUseCase } from '../application/use-cases/join-waitlist.use-case';

/** POST /v1/waitlist — alta pública e idempotente en la waitlist (docs/10 §2.1; backlog S1.4-H2). */
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly joinWaitlist: JoinWaitlistUseCase) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(waitlistSchema))
  async join(@Body() body: WaitlistInput): Promise<{ entry: WaitlistEntryDto }> {
    const entry = await this.joinWaitlist.execute(body);
    return { entry };
  }
}

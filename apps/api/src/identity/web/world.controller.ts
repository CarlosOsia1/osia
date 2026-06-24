import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { worldTicketSchema, type WorldTicketDto, type WorldTicketInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { IssueWorldTicketUseCase } from '../application/use-cases/issue-world-ticket.use-case';

/** POST /v1/world/tickets — emite el world ticket para una cuenta autenticada (docs/10 §1.6). */
@Controller('world')
@UseGuards(AuthGuard)
export class WorldController {
  constructor(private readonly issueTicket: IssueWorldTicketUseCase) {}

  @Post('tickets')
  @HttpCode(200)
  async tickets(
    // Pipe a nivel de @Body (NO @UsePipes: aplicaría también a @CurrentAccount y lo corromperia).
    @Body(new ZodValidationPipe(worldTicketSchema)) body: WorldTicketInput,
    @CurrentAccount() account: AccountContext,
  ): Promise<WorldTicketDto> {
    return this.issueTicket.execute(account.accountId, body.worldId);
  }
}

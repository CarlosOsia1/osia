import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { worldTicketSchema, type WorldTicketDto, type WorldTicketInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { IssueWorldTicketUseCase } from '../application/use-cases/issue-world-ticket.use-case';
import { IceService, type IceConfig } from '../application/ice.service';

/** POST /v1/world/tickets — emite el world ticket; GET /v1/world/ice — credenciales STUN/TURN de voz. */
@Controller('world')
@UseGuards(AuthGuard)
export class WorldController {
  constructor(
    private readonly issueTicket: IssueWorldTicketUseCase,
    private readonly ice: IceService,
  ) {}

  @Post('tickets')
  @HttpCode(200)
  async tickets(
    // Pipe a nivel de @Body (NO @UsePipes: aplicaría también a @CurrentAccount y lo corromperia).
    @Body(new ZodValidationPipe(worldTicketSchema)) body: WorldTicketInput,
    @CurrentAccount() account: AccountContext,
  ): Promise<WorldTicketDto> {
    return this.issueTicket.execute(account.accountId, body.worldId);
  }

  /** Config ICE (STUN + TURN efímero) para la voz P2P (Ola 4). El cliente la usa en RTCPeerConnection. */
  @Get('ice')
  getIceConfig(@CurrentAccount() account: AccountContext): IceConfig {
    return this.ice.forAccount(account.accountId);
  }
}

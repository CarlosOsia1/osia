import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { listQuerySchema, type FollowRequestDto, type ListQueryInput, type Page } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { FollowGraphService } from '../application/follow-graph.service';
import { AcceptFollowRequestUseCase } from '../application/use-cases/accept-follow-request.use-case';
import { RejectFollowRequestUseCase } from '../application/use-cases/reject-follow-request.use-case';

const requesterIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Solicitudes de seguimiento (S3.9) para cuentas privadas: listar las ENTRANTES pendientes y
 * aceptar/rechazar. Solo el dueño gestiona las suyas (el accountId sale del token, no de la ruta).
 * `@Controller('follows')` con paths propios (`requests…`), sin colisión con follow/unfollow.
 */
@Controller('follows')
@UseGuards(AuthGuard)
export class FollowRequestsController {
  constructor(
    private readonly graph: FollowGraphService,
    private readonly acceptRequest: AcceptFollowRequestUseCase,
    private readonly rejectRequest: RejectFollowRequestUseCase,
  ) {}

  @Get('requests')
  requests(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<FollowRequestDto>> {
    return this.graph.listMyRequests(account.accountId, query);
  }

  @Post('requests/:requesterId/accept')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async accept(
    @CurrentAccount() account: AccountContext,
    @Param('requesterId', requesterIdParam) requesterId: string,
  ): Promise<void> {
    await this.acceptRequest.execute(account.accountId, requesterId);
  }

  @Post('requests/:requesterId/reject')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async reject(
    @CurrentAccount() account: AccountContext,
    @Param('requesterId', requesterIdParam) requesterId: string,
  ): Promise<void> {
    await this.rejectRequest.execute(account.accountId, requesterId);
  }
}

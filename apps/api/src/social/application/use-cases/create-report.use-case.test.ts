/** CreateReportUseCase (S3.6-H2) — encola el reporte; 404 si el target no existe. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, type CreateReportInput } from '@osia/shared';
import { CreateReportUseCase } from './create-report.use-case';
import type { ReportRepository } from '../ports/out/report.repository';
import { AppException } from '../../../common/app-exception';

const input: CreateReportInput = {
  targetType: 'post',
  targetId: '0190b8e0-7c1e-7b3a-8a4e-0000000000a1',
  reason: 'spam',
};

test('encola el reporte con los datos del solicitante (target existe)', async () => {
  const calls: Array<[string, string, string, string]> = [];
  const repo: ReportRepository = {
    create: async (reporter, type, id, reason) => {
      calls.push([reporter, type, id, reason]);
      return true;
    },
  };
  await new CreateReportUseCase(repo).execute('reporter-1', input);
  assert.deepEqual(calls, [['reporter-1', 'post', '0190b8e0-7c1e-7b3a-8a4e-0000000000a1', 'spam']]);
});

test('target inexistente → NOT_FOUND (404), no encola basura', async () => {
  const repo: ReportRepository = { create: async () => false };
  await assert.rejects(
    () => new CreateReportUseCase(repo).execute('reporter-1', input),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});

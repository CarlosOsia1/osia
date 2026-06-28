/** CreateReportUseCase (S3.6-H2) — encola el reporte pasando (reporter, type, id, reason) al repo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CreateReportInput } from '@osia/shared';
import { CreateReportUseCase } from './create-report.use-case';
import type { ReportRepository } from '../ports/out/report.repository';

test('encola el reporte con los datos del solicitante', async () => {
  const calls: Array<[string, string, string, string]> = [];
  const repo: ReportRepository = {
    create: async (reporter, type, id, reason) => {
      calls.push([reporter, type, id, reason]);
    },
  };
  const input: CreateReportInput = {
    targetType: 'post',
    targetId: '0190b8e0-7c1e-7b3a-8a4e-0000000000a1',
    reason: 'spam',
  };
  await new CreateReportUseCase(repo).execute('reporter-1', input);
  assert.deepEqual(calls, [['reporter-1', 'post', '0190b8e0-7c1e-7b3a-8a4e-0000000000a1', 'spam']]);
});

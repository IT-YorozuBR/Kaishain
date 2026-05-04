import * as XLSX from 'xlsx';
import { type NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { listEvaluationsForExport } from '@/server/services/evaluations';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse('Nao autorizado.', { status: 401 });
  }

  if (user.role !== 'RH' && user.role !== 'ADMIN') {
    return new NextResponse('Acesso negado.', { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const evaluatorId = sp.get('evaluatorId') || undefined;
  const dateFrom = sp.get('dateFrom') || undefined;
  const dateTo = sp.get('dateTo') || undefined;
  const department = sp.get('department') || undefined;

  const items = await listEvaluationsForExport({ evaluatorId, dateFrom, dateTo, department });

  const header = ['Data', 'Funcionario', 'Departamento', 'Cargo', 'Avaliador', 'Nota', 'Observacao'];
  const dataRows = items.map((item) => [
    formatDate(item.evaluationDate),
    item.employee.name,
    item.employee.department ?? '',
    item.employee.position ?? '',
    item.evaluator.name,
    item.score,
    item.note ?? '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 22 },
    { wch: 28 },
    { wch: 28 },
    { wch: 8 },
    { wch: 50 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Avaliacoes');

  const today = new Date().toISOString().split('T')[0];
  const buffer = new Uint8Array(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="avaliacoes-${today}.xlsx"`,
    },
  });
}

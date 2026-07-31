import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Download, Save, FileText, Loader2, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, Item, Invoice, InvoiceLine, InvoiceStatus } from '@/types';

interface DraftLine {
  id: string;
  item_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percent: number;
}

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const isNew = invoiceId === 'new';
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('unpaid');
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    (async () => {
      const [c, it] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('items').select('*').order('name'),
      ]);
      setCustomers((c.data as Customer[]) ?? []);
      setItems((it.data as Item[]) ?? []);

      if (!isNew) {
        const { data: inv } = await supabase.from('invoices').select('*, customer:customers(*)').eq('id', invoiceId).maybeSingle();
        const { data: dbLines } = await supabase.from('invoice_lines').select('*').eq('invoice_id', invoiceId).order('id');
        if (inv) {
          setInvoice(inv as Invoice);
          setCustomerId((inv as any).customer_id ?? '');
          setIssueDate((inv as any).issue_date ?? issueDate);
          setDueDate((inv as any).due_date ?? '');
          setStatus((inv as any).status ?? 'unpaid');
          setNotes((inv as any).notes ?? '');
          setAmountPaid(String((inv as any).amount_paid ?? ''));
          setLines(((dbLines as InvoiceLine[]) ?? []).map((l) => ({
            id: l.id, item_id: l.item_id, name: l.name, description: l.description ?? '',
            quantity: l.quantity, unit_price: l.unit_price, vat_percent: l.vat_percent,
          })));
        }
      }
      setLoading(false);
    })();
  }, [invoiceId]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    for (const l of lines) {
      const lineNet = l.quantity * l.unit_price;
      const lineVat = lineNet * (l.vat_percent / 100);
      subtotal += lineNet;
      vatTotal += lineVat;
    }
    return { subtotal, vatTotal, total: subtotal + vatTotal };
  }, [lines]);

  const addItem = (itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    setLines((prev) => [...prev, {
      id: Math.random().toString(36).slice(2), item_id: it.id, name: it.name,
      description: it.description ?? '', quantity: 1, unit_price: it.price, vat_percent: it.vat_percent,
    }]);
  };

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      let invId = invoiceId;
      if (isNew) {
        const { data: numData, error: numErr } = await supabase.rpc('next_invoice_number');
        if (numErr || !numData) { toast('Failed to generate invoice number', 'error'); setSaving(false); return; }
        const invoiceNumber = numData as string;
        const { data: newInv, error } = await supabase.from('invoices').insert({
          customer_id: customerId || null,
          invoice_number: invoiceNumber,
          status,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes,
          subtotal: totals.subtotal,
          vat_total: totals.vatTotal,
          total: totals.total,
          amount_paid: amountPaid ? parseFloat(amountPaid) : 0,
        }).select().single();
        if (error) { toast(error.message, 'error'); setSaving(false); return; }
        invId = (newInv as any).id;
      } else {
        const { error } = await supabase.from('invoices').update({
          customer_id: customerId || null,
          status,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes,
          subtotal: totals.subtotal,
          vat_total: totals.vatTotal,
          total: totals.total,
          amount_paid: amountPaid ? parseFloat(amountPaid) : 0,
        }).eq('id', invoiceId);
        if (error) { toast(error.message, 'error'); setSaving(false); return; }
        await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);
      }

      if (lines.length > 0) {
        const lineRows = lines.map((l) => {
          const lineNet = l.quantity * l.unit_price;
          const lineVat = lineNet * (l.vat_percent / 100);
          return {
            invoice_id: invId,
            item_id: l.item_id,
            name: l.name,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            vat_percent: l.vat_percent,
            line_total: lineNet,
            line_vat: lineVat,
          };
        });
        const { error: lineErr } = await supabase.from('invoice_lines').insert(lineRows);
        if (lineErr) toast(`Lines: ${lineErr.message}`, 'error');
      }

      toast('Invoice saved', 'success');
      navigate('/accounting/invoices');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const customer = customers.find((c) => c.id === customerId);
    const html = buildInvoiceHTML({
      invoiceNumber: invoice?.invoice_number ?? 'INV-NEW',
      issueDate,
      dueDate,
      customer,
      lines,
      totals,
      notes,
      status,
    });
    const w = window.open('', '_blank');
    if (!w) { toast('Please allow popups to download PDF', 'error'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div>
      <button onClick={() => navigate('/accounting/invoices')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 dark:hover:text-ink-200 mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.back')}
      </button>

      <PageHeader
        title={isNew ? t('inv.add') : `${t('inv.number')}: ${invoice?.invoice_number}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={generatePDF}><Download className="h-4 w-4" /> {t('inv.download')}</Button>
            <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> {t('common.save')}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">{t('inv.lines')}</h3>
          <div className="mb-4">
            <Select label="Add item" value="" onChange={(e) => { if (e.target.value) addItem(e.target.value); e.target.value = ''; }}>
              <option value="">Select an item to add…</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name} — {formatCurrency(it.price)}</option>)}
            </Select>
          </div>

          {lines.length === 0 ? (
            <EmptyState icon={<FileText className="h-7 w-7" />} title="No line items" description="Add items from the dropdown above." />
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.id} className="rounded-xl border border-ink-200 dark:border-ink-700 p-3">
                  <div className="flex items-start gap-2">
                    <Input placeholder="Item name" value={l.name} onChange={(e) => updateLine(l.id, { name: e.target.value })} className="flex-1" />
                    <button onClick={() => removeLine(l.id)} className="p-2.5 rounded-xl text-ink-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Input type="number" label="Qty" value={l.quantity} onChange={(e) => updateLine(l.id, { quantity: parseFloat(e.target.value) || 0 })} />
                    <Input type="number" label="Unit Price" value={l.unit_price} onChange={(e) => updateLine(l.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                    <Input type="number" label="VAT %" value={l.vat_percent} onChange={(e) => updateLine(l.id, { vat_percent: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <p className="mt-2 text-sm text-right font-medium">
                    {formatCurrency(l.quantity * l.unit_price * (1 + l.vat_percent / 100))}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-800 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-ink-500">{t('inv.subtotal')}</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">{t('inv.vat')}</span><span>{formatCurrency(totals.vatTotal)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1.5 border-t border-ink-100 dark:border-ink-800"><span>{t('inv.total')}</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Details</h3>
          <div className="space-y-3">
            <Select label={t('inv.customer')} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input type="date" label={t('inv.issueDate')} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            <Input type="date" label={t('inv.dueDate')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Select label={t('inv.status')} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              <option value="unpaid">{t('inv.unpaid')}</option>
              <option value="partial">{t('inv.partial')}</option>
              <option value="paid">{t('inv.paid')}</option>
            </Select>
            <Input type="number" label="Amount Paid" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            <Textarea label={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildInvoiceHTML(opts: {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customer?: Customer;
  lines: DraftLine[];
  totals: { subtotal: number; vatTotal: number; total: number };
  notes: string;
  status: InvoiceStatus;
}): string {
  const { invoiceNumber, issueDate, dueDate, customer, lines, totals, notes, status } = opts;
  const rows = lines.map((l) => {
    const net = l.quantity * l.unit_price;
    const vat = net * (l.vat_percent / 100);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${l.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${l.unit_price.toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${l.vat_percent}%</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${(net + vat).toFixed(2)}</td>
    </tr>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNumber}</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { color: #2563eb; margin: 0; font-size: 28px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .box { background: #f8fafc; border-radius: 12px; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { text-align: left; padding: 10px 8px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .totals { margin-left: auto; width: 280px; }
    .totals td { padding: 8px 0; }
    .grand { font-size: 20px; font-weight: bold; border-top: 2px solid #2563eb; padding-top: 12px !important; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; }
  </style></head><body>
    <div class="header">
      <div>
        <h1>BRO Portal</h1>
        <p style="color:#64748b;margin:4px 0 0">Business Resource Operations</p>
      </div>
      <div style="text-align:right">
        <h2 style="margin:0;font-size:22px">INVOICE</h2>
        <p style="color:#64748b;margin:4px 0">${invoiceNumber}</p>
        <span class="badge">${status.toUpperCase()}</span>
      </div>
    </div>
    <div style="display:flex;gap:20px;margin-bottom:30px">
      <div class="box" style="flex:1">
        <p style="font-size:12px;color:#64748b;margin:0 0 4px">Bill To</p>
        <p style="font-weight:600;margin:0">${customer?.name ?? '—'}</p>
        <p style="font-size:14px;color:#64748b;margin:4px 0">${customer?.email ?? ''}</p>
        <p style="font-size:14px;color:#64748b;margin:0">${customer?.phone ?? ''}</p>
        <p style="font-size:14px;color:#64748b;margin:4px 0">${customer?.address ?? ''}</p>
        ${customer?.tax_number ? `<p style="font-size:14px;color:#64748b;margin:4px 0">TRN: ${customer.tax_number}</p>` : ''}
      </div>
      <div class="box" style="flex:1">
        <p style="font-size:12px;color:#64748b;margin:0 0 4px">Issue Date</p>
        <p style="font-weight:600;margin:0 0 12px">${formatDate(issueDate)}</p>
        <p style="font-size:12px;color:#64748b;margin:0 0 4px">Due Date</p>
        <p style="font-weight:600;margin:0">${formatDate(dueDate) || '—'}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">VAT</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table style="margin:0">
        <tr><td style="color:#64748b">Subtotal</td><td style="text-align:right">${totals.subtotal.toFixed(2)}</td></tr>
        <tr><td style="color:#64748b">VAT</td><td style="text-align:right">${totals.vatTotal.toFixed(2)}</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right">${totals.total.toFixed(2)} AED</td></tr>
      </table>
    </div>
    ${notes ? `<div class="box" style="margin-top:30px"><p style="font-size:12px;color:#64748b;margin:0 0 4px">Notes</p><p style="margin:0;font-size:14px">${notes}</p></div>` : ''}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:40px">Thank you for your business.</p>
  </body></html>`;
}

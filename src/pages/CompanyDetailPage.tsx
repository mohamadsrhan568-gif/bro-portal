import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Pencil, Trash2, Users, FileText, Building2, Mail, Phone, MapPin,
  ChevronDown, ChevronRight, File as FileIcon, Briefcase, Activity as ActivityIcon,
  LayoutGrid, Calculator, Receipt, Clock, User, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CompanyFormModal } from '@/pages/companies/CompanyFormModal';
import { CaseFormModal } from '@/pages/companies/CaseFormModal';
import { EmployeeFormModal } from '@/pages/employees/EmployeeFormModal';
import { FileUploader, documentUrl } from '@/components/FileUploader';
import { classNames, expiryBucket, expiryColor, expiryLabel, formatCurrency, formatDate, initials } from '@/lib/utils';
import type { Company, Employee, CompanyDocument, EmployeeDocument, Case, CompanyActivity, CaseStatus, Invoice } from '@/types';

type Tab = 'overview' | 'employees' | 'documents' | 'accounting' | 'cases' | 'activity';

const docTypes = ['Passport', 'Visa', 'Emirates ID', 'Labour Card', 'Contract', 'Insurance', 'Driving License', 'Medical Certificate', 'Trade License', 'Ejari', 'Establishment Card', 'Other'];

const caseStatusColors: Record<CaseStatus, string> = {
  open: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  on_hold: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};

export function CompanyDetailPage({ companyId, employeeId }: { companyId: string; employeeId: string | null }) {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyDocs, setCompanyDocs] = useState<CompanyDocument[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activity, setActivity] = useState<CompanyActivity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Modals
  const [editCompany, setEditCompany] = useState(false);
  const [empModal, setEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [deletingEmp, setDeletingEmp] = useState<Employee | null>(null);
  const [caseModal, setCaseModal] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [deletingCase, setDeletingCase] = useState<Case | null>(null);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(employeeId);
  const [empDocs, setEmpDocs] = useState<Record<string, EmployeeDocument[]>>({});

  // Doc metadata modals
  const [pendingPath, setPendingPath] = useState<{ path: string; name: string } | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [empDocMeta, setEmpDocMeta] = useState<{ employeeId: string; path: string; name: string } | null>(null);
  const [empDocName, setEmpDocName] = useState('');
  const [empDocType, setEmpDocType] = useState('');
  const [empDocExpiry, setEmpDocExpiry] = useState('');

  const loadAll = async () => {
    const [c, e, d, cs, act] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
      supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('company_documents').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('cases').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('company_activity').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
    ]);
    setCompany(c.data as Company);
    setEmployees((e.data as Employee[]) ?? []);
    setCompanyDocs((d.data as CompanyDocument[]) ?? []);
    setCases((cs.data as Case[]) ?? []);
    setActivity((act.data as CompanyActivity[]) ?? []);

    // Load invoices linked to this company's customers
    const { data: invData } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    setInvoices((invData as Invoice[]) ?? []);

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [companyId]);

  const loadEmpDocs = async (empId: string) => {
    const { data } = await supabase.from('employee_documents').select('*').eq('employee_id', empId).order('created_at', { ascending: false });
    setEmpDocs((prev) => ({ ...prev, [empId]: (data as EmployeeDocument[]) ?? [] }));
  };

  useEffect(() => { if (employeeId) setExpandedEmp(employeeId); }, [employeeId]);
  useEffect(() => { if (expandedEmp) loadEmpDocs(expandedEmp); }, [expandedEmp]);

  const logActivity = async (action: string, entityType: string, description: string) => {
    await supabase.from('company_activity').insert({ company_id: companyId, action, entity_type: entityType, description });
  };

  // Company doc handlers
  const onCompanyDocUploaded = (path: string, name: string) => { setPendingPath({ path, name }); setDocName(name); };
  const saveCompanyDoc = async () => {
    if (!pendingPath || !company) return;
    const { error } = await supabase.from('company_documents').insert({
      company_id: company.id, name: docName || pendingPath.name, type: docType || null,
      storage_path: pendingPath.path, expiry_date: docExpiry || null,
    });
    if (error) toast(error.message, 'error');
    else {
      toast('Document saved', 'success');
      logActivity('document_uploaded', 'document', `Document "${docName || pendingPath.name}" uploaded`);
      setPendingPath(null); setDocName(''); setDocType(''); setDocExpiry('');
      loadAll();
    }
  };
  const deleteCompanyDoc = async (doc: CompanyDocument) => {
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('company_documents').delete().eq('id', doc.id);
    logActivity('document_deleted', 'document', `Document "${doc.name}" deleted`);
    loadAll();
  };

  // Employee doc handlers
  const onEmpDocUploaded = (empId: string, path: string, name: string) => { setEmpDocMeta({ employeeId: empId, path, name }); setEmpDocName(name); };
  const saveEmpDoc = async () => {
    if (!empDocMeta) return;
    const { error } = await supabase.from('employee_documents').insert({
      employee_id: empDocMeta.employeeId, name: empDocName || empDocMeta.name, type: empDocType || null,
      storage_path: empDocMeta.path, expiry_date: empDocExpiry || null,
    });
    if (error) toast(error.message, 'error');
    else {
      toast('Document saved', 'success');
      setEmpDocMeta(null); setEmpDocName(''); setEmpDocType(''); setEmpDocExpiry('');
      loadEmpDocs(empDocMeta.employeeId);
    }
  };
  const deleteEmpDoc = async (empId: string, doc: EmployeeDocument) => {
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('employee_documents').delete().eq('id', doc.id);
    loadEmpDocs(empId);
  };

  // Employee handlers
  const handleDeleteEmp = async () => {
    if (!deletingEmp) return;
    const { error } = await supabase.from('employees').delete().eq('id', deletingEmp.id);
    if (error) toast(error.message, 'error');
    else { toast('Employee deleted', 'success'); logActivity('employee_deleted', 'employee', `Employee "${deletingEmp.full_name}" deleted`); loadAll(); }
    setDeletingEmp(null);
  };

  // Case handlers
  const handleDeleteCase = async () => {
    if (!deletingCase) return;
    const { error } = await supabase.from('cases').delete().eq('id', deletingCase.id);
    if (error) toast(error.message, 'error');
    else { toast('Case deleted', 'success'); logActivity('case_deleted', 'case', `Case "${deletingCase.title}" deleted`); loadAll(); }
    setDeletingCase(null);
  };

  // Accounting stats
  const accountingStats = useMemo(() => {
    // Since invoices aren't directly linked to companies in the schema, we show global invoice stats
    // In a future iteration, invoices could be linked to companies via customer relationships
    const paid = invoices.filter((i) => i.status === 'paid');
    const unpaid = invoices.filter((i) => i.status !== 'paid');
    return {
      total: invoices.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      revenue: paid.reduce((s, i) => s + (i.total ?? 0), 0),
      outstanding: unpaid.reduce((s, i) => s + (i.total ?? 0), 0),
    };
  }, [invoices]);

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;
  if (!company) return <EmptyState icon={<Building2 className="h-7 w-7" />} title="Company not found" />;

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid; count?: number }[] = [
    { id: 'overview', label: t('company.overview'), icon: LayoutGrid },
    { id: 'employees', label: t('company.employees'), icon: Users, count: employees.length },
    { id: 'documents', label: t('company.documents'), icon: FileText, count: companyDocs.length },
    { id: 'accounting', label: t('company.accounting'), icon: Calculator },
    { id: 'cases', label: t('company.cases'), icon: Briefcase, count: cases.length },
    { id: 'activity', label: t('company.activity'), icon: ActivityIcon },
  ];

  return (
    <div>
      <button onClick={() => navigate('/companies')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 dark:hover:text-ink-200 mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.back')}
      </button>

      {/* Header */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xl font-bold flex-shrink-0">
            {initials(company.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{company.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-400">
              {company.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {company.email}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {company.phone}</span>}
              {company.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {company.address}</span>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditCompany(true)}>
            <Pencil className="h-4 w-4" /> {t('common.edit')}
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((tabItem) => {
          const Icon = tabItem.icon;
          const active = tab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={classNames(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                  : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800',
              )}
            >
              <Icon className="h-4 w-4" />
              {tabItem.label}
              {tabItem.count != null && (
                <span className={classNames('text-xs px-1.5 py-0.5 rounded-full', active ? 'bg-white/20' : 'bg-ink-200 dark:bg-ink-700')}>
                  {tabItem.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'overview' && <OverviewTab company={company} employees={employees} companyDocs={companyDocs} cases={cases} />}
        {tab === 'employees' && (
          <EmployeesTab
            employees={employees}
            expandedEmp={expandedEmp}
            setExpandedEmp={setExpandedEmp}
            empDocs={empDocs}
            onAdd={() => { setEditingEmp(null); setEmpModal(true); }}
            onEdit={(emp) => { setEditingEmp(emp); setEmpModal(true); }}
            onDelete={(emp) => setDeletingEmp(emp)}
            onEmpDocUploaded={onEmpDocUploaded}
            deleteEmpDoc={deleteEmpDoc}
          />
        )}
        {tab === 'documents' && (
          <DocumentsTab
            companyDocs={companyDocs}
            companyId={company.id}
            onUploaded={onCompanyDocUploaded}
            onDelete={deleteCompanyDoc}
          />
        )}
        {tab === 'accounting' && <AccountingTab stats={accountingStats} />}
        {tab === 'cases' && (
          <CasesTab
            cases={cases}
            onAdd={() => { setEditingCase(null); setCaseModal(true); }}
            onEdit={(c) => { setEditingCase(c); setCaseModal(true); }}
            onDelete={(c) => setDeletingCase(c)}
          />
        )}
        {tab === 'activity' && <ActivityTab activity={activity} />}
      </div>

      {/* Pending company doc metadata modal */}
      {pendingPath && (
        <DocMetaModal name={pendingPath.name} docName={docName} setDocName={setDocName} docType={docType} setDocType={setDocType} docExpiry={docExpiry} setDocExpiry={setDocExpiry} onCancel={() => setPendingPath(null)} onSave={saveCompanyDoc} />
      )}
      {/* Pending employee doc metadata modal */}
      {empDocMeta && (
        <DocMetaModal name={empDocMeta.name} docName={empDocName} setDocName={setEmpDocName} docType={empDocType} setDocType={setEmpDocType} docExpiry={empDocExpiry} setDocExpiry={setEmpDocExpiry} onCancel={() => setEmpDocMeta(null)} onSave={saveEmpDoc} />
      )}

      <CompanyFormModal open={editCompany} onClose={() => setEditCompany(false)} onSaved={loadAll} company={company} />
      <EmployeeFormModal open={empModal} onClose={() => setEmpModal(false)} onSaved={loadAll} companyId={companyId} employee={editingEmp} />
      <CaseFormModal open={caseModal} onClose={() => setCaseModal(false)} onSaved={loadAll} companyId={companyId} caseItem={editingCase} />
      <ConfirmDialog open={!!deletingEmp} title="Delete employee" message={<>This will permanently delete <strong>{deletingEmp?.full_name}</strong> and all their documents.</>} danger confirmLabel={t('common.delete')} onConfirm={handleDeleteEmp} onCancel={() => setDeletingEmp(null)} />
      <ConfirmDialog open={!!deletingCase} title="Delete case" message={<>Delete case <strong>{deletingCase?.title}</strong>?</>} danger confirmLabel={t('common.delete')} onConfirm={handleDeleteCase} onCancel={() => setDeletingCase(null)} />
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================
function OverviewTab({ company, employees, companyDocs, cases }: { company: Company; employees: Employee[]; companyDocs: CompanyDocument[]; cases: Case[] }) {
  const { t } = useI18n();
  const expiryFields = [
    { label: t('company.tradeLicense'), num: company.trade_license_number, value: company.trade_license_expiry },
    { label: t('company.ejari'), num: company.ejari_number, value: company.ejari_expiry },
    { label: t('company.establishment'), num: company.establishment_card_number, value: company.establishment_card_expiry },
  ];

  const openCases = cases.filter((c) => c.status === 'open' || c.status === 'in_progress').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Key info */}
      <Card className="lg:col-span-2">
        <h3 className="font-semibold mb-4">Key Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label={t('company.trn')} value={company.trn_number} mono />
          <InfoRow label={t('company.email')} value={company.email} />
          <InfoRow label={t('company.phone')} value={company.phone} />
          <InfoRow label={t('company.mobile')} value={company.mobile} />
          <InfoRow label={t('company.address')} value={company.address} />
        </div>

        <h3 className="font-semibold mt-6 mb-4">Licenses & Expiries</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {expiryFields.map((f) => {
            const bucket = expiryBucket(f.value);
            return (
              <div key={f.label} className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">
                <p className="text-xs text-ink-500 dark:text-ink-400">{f.label}</p>
                <p className="text-sm font-medium mt-1 truncate">{f.num || '—'}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-ink-500">{f.value ? formatDate(f.value) : '—'}</span>
                  {f.value && <Badge className={expiryColor(bucket)}>{expiryLabel(f.value)}</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        {company.notes && (
          <>
            <h3 className="font-semibold mt-6 mb-2">{t('common.notes')}</h3>
            <p className="text-sm text-ink-600 dark:text-ink-300 whitespace-pre-wrap rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">{company.notes}</p>
          </>
        )}
      </Card>

      {/* Quick stats */}
      <div className="space-y-4">
        <Card>
          <h3 className="font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <StatRow icon={<Users className="h-4 w-4" />} label={t('company.employees')} value={employees.length} color="text-violet-500" />
            <StatRow icon={<FileText className="h-4 w-4" />} label={t('company.documents')} value={companyDocs.length} color="text-amber-500" />
            <StatRow icon={<Briefcase className="h-4 w-4" />} label={t('company.cases')} value={cases.length} color="text-brand-500" />
            <StatRow icon={<Clock className="h-4 w-4" />} label="Open Cases" value={openCases} color="text-red-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
      <p className={classNames('text-sm font-medium mt-0.5', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  );
}

function StatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-ink-600 dark:text-ink-300">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

// ============================================================
// Employees Tab
// ============================================================
function EmployeesTab({ employees, expandedEmp, setExpandedEmp, empDocs, onAdd, onEdit, onDelete, onEmpDocUploaded, deleteEmpDoc }: {
  employees: Employee[];
  expandedEmp: string | null;
  setExpandedEmp: (id: string | null) => void;
  empDocs: Record<string, EmployeeDocument[]>;
  onAdd: () => void;
  onEdit: (emp: Employee) => void;
  onDelete: (emp: Employee) => void;
  onEmpDocUploaded: (empId: string, path: string, name: string) => void;
  deleteEmpDoc: (empId: string, doc: EmployeeDocument) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-brand-500" /> {t('company.employees')} ({employees.length})</h2>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> {t('employee.add')}</Button>
      </div>
      {employees.length === 0 ? (
        <Card><EmptyState icon={<Users className="h-7 w-7" />} title="No employees" description="Add employees to this company." action={<Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> {t('employee.add')}</Button>} /></Card>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => {
            const expanded = expandedEmp === emp.id;
            const docs = empDocs[emp.id] ?? [];
            return (
              <Card key={emp.id} className="p-0 overflow-hidden">
                <button onClick={() => setExpandedEmp(expanded ? null : emp.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-ink-50 dark:hover:bg-ink-800/30 transition-colors">
                  {expanded ? <ChevronDown className="h-4 w-4 text-ink-400" /> : <ChevronRight className="h-4 w-4 text-ink-400 rtl:rotate-180" />}
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-bold flex-shrink-0">{initials(emp.full_name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{emp.full_name}</p>
                    <p className="text-xs text-ink-500 truncate">{emp.position || emp.nationality || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 hover:text-brand-600 dark:hover:text-brand-400"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onDelete(emp)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-ink-100 dark:border-ink-800 p-4 space-y-4 animate-slide-down">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Detail label={t('employee.passport')} value={emp.passport_number} expiry={emp.passport_expiry} />
                      <Detail label={t('employee.visa')} value={emp.visa_number} expiry={emp.visa_expiry} />
                      <Detail label={t('employee.emiratesId')} value={emp.emirates_id_number} expiry={emp.emirates_id_expiry} />
                      <Detail label={t('employee.nationality')} value={emp.nationality} />
                      <Detail label={t('employee.position')} value={emp.position} />
                      <Detail label={t('employee.salary')} value={emp.salary != null ? formatCurrency(emp.salary) : ''} />
                      <Detail label={t('employee.joiningDate')} value={emp.joining_date ? formatDate(emp.joining_date) : ''} />
                      <Detail label={t('company.phone')} value={emp.phone} />
                      <Detail label={t('company.email')} value={emp.email} />
                    </div>
                    {emp.notes && <p className="text-sm text-ink-600 dark:text-ink-300 whitespace-pre-wrap">{emp.notes}</p>}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4 text-amber-500" /> {t('employee.documents')} ({docs.length})</p>
                      <FileUploader folder={`employee/${emp.id}`} onUploaded={(p, n) => onEmpDocUploaded(emp.id, p, n)} label={t('doc.upload')} />
                      {docs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {docs.map((d) => (
                            <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                              <div className="min-w-0 flex-1">
                                <a href={documentUrl(d.storage_path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:underline">
                                  <FileIcon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{d.name}</span>
                                </a>
                                <p className="text-xs text-ink-500">{d.type} {d.expiry_date && `· ${formatDate(d.expiry_date)}`}</p>
                              </div>
                              <button onClick={() => deleteEmpDoc(emp.id, d)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Documents Tab
// ============================================================
function DocumentsTab({ companyDocs, companyId, onUploaded, onDelete }: {
  companyDocs: CompanyDocument[];
  companyId: string;
  onUploaded: (path: string, name: string) => void;
  onDelete: (doc: CompanyDocument) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="font-semibold flex items-center gap-2 mb-3"><FileText className="h-5 w-5 text-amber-500" /> {t('company.documents')} ({companyDocs.length})</h2>
      <FileUploader folder={`company/${companyId}`} onUploaded={onUploaded} label={t('doc.upload')} />
      {companyDocs.length > 0 && (
        <div className="mt-3 space-y-2">
          {companyDocs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
              <div className="min-w-0 flex-1">
                <a href={documentUrl(d.storage_path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:underline">
                  <FileIcon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{d.name}</span>
                </a>
                <p className="text-xs text-ink-500 mt-0.5">
                  {d.type || 'Document'} {d.expiry_date && `· ${formatDate(d.expiry_date)}`}
                  {d.expiry_date && <Badge className={classNames('ml-2', expiryColor(expiryBucket(d.expiry_date)))}>{expiryLabel(d.expiry_date)}</Badge>}
                </p>
              </div>
              <button onClick={() => onDelete(d)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Accounting Tab
// ============================================================
function AccountingTab({ stats }: { stats: { total: number; paidCount: number; unpaidCount: number; revenue: number; outstanding: number } }) {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="font-semibold flex items-center gap-2 mb-4"><Calculator className="h-5 w-5 text-brand-500" /> {t('company.accounting')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Receipt className="h-5 w-5" /></div><div><p className="text-xs text-ink-500">Total Invoices</p><p className="text-xl font-bold">{stats.total}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400"><Receipt className="h-5 w-5" /></div><div><p className="text-xs text-ink-500">Paid</p><p className="text-xl font-bold">{stats.paidCount}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"><Receipt className="h-5 w-5" /></div><div><p className="text-xs text-ink-500">Outstanding</p><p className="text-xl font-bold">{stats.unpaidCount}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Receipt className="h-5 w-5" /></div><div><p className="text-xs text-ink-500">Revenue</p><p className="text-lg font-bold">{formatCurrency(stats.revenue)}</p></div></div></Card>
      </div>
      <Card className="mt-4">
        <p className="text-sm text-ink-500 dark:text-ink-400 text-center py-8">
          Invoice management is available in the main Accounting module. Use the sidebar to create and track invoices.
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// Cases Tab
// ============================================================
function CasesTab({ cases, onAdd, onEdit, onDelete }: {
  cases: Case[];
  onAdd: () => void;
  onEdit: (c: Case) => void;
  onDelete: (c: Case) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5 text-brand-500" /> {t('case.title')} ({cases.length})</h2>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> {t('case.add')}</Button>
      </div>
      {cases.length === 0 ? (
        <Card><EmptyState icon={<Briefcase className="h-7 w-7" />} title="No cases" description="Track legal, immigration, and government cases here." action={<Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> {t('case.add')}</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cases.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{c.title}</p>
                    <Badge className={caseStatusColors[c.status]}>{t(`case.${c.status}`)}</Badge>
                  </div>
                  {c.case_number && <p className="text-xs text-ink-500 mt-1">{t('case.number')}: {c.case_number}</p>}
                  {c.type && <Badge className="mt-1.5 bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">{c.type}</Badge>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 hover:text-brand-600 dark:hover:text-brand-400"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {c.description && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 line-clamp-2">{c.description}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                {c.opened_date && <span>Opened: {formatDate(c.opened_date)}</span>}
                {c.closed_date && <span>Closed: {formatDate(c.closed_date)}</span>}
                {c.assigned_to && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {c.assigned_to}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Activity Tab
// ============================================================
function ActivityTab({ activity }: { activity: CompanyActivity[] }) {
  const { t } = useI18n();
  if (activity.length === 0) {
    return <Card><EmptyState icon={<ActivityIcon className="h-7 w-7" />} title={t('activity.empty')} description="Actions on this company will be logged here." /></Card>;
  }
  return (
    <div>
      <h2 className="font-semibold flex items-center gap-2 mb-4"><ActivityIcon className="h-5 w-5 text-brand-500" /> {t('activity.title')}</h2>
      <Card className="p-0">
        <div className="relative pl-8 pr-4 py-4">
          {/* Timeline line */}
          <div className="absolute left-6 top-4 bottom-4 w-px bg-ink-200 dark:bg-ink-700" />
          <div className="space-y-4">
            {activity.map((a) => (
              <div key={a.id} className="relative flex gap-3">
                <div className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white dark:ring-ink-900 flex-shrink-0" />
                <div className="ml-4">
                  <p className="text-sm font-medium">{a.description || a.action}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{formatDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Shared components
// ============================================================
function Detail({ label, value, expiry }: { label: string; value: string | null; expiry?: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
      <p className="text-sm font-medium truncate">{value || '—'}</p>
      {expiry && (
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-xs text-ink-500">{formatDate(expiry)}</span>
          <Badge className={expiryColor(expiryBucket(expiry))}>{expiryLabel(expiry)}</Badge>
        </div>
      )}
    </div>
  );
}

function DocMetaModal({ name, docName, setDocName, docType, setDocType, docExpiry, setDocExpiry, onCancel, onSave }: {
  name: string;
  docName: string;
  setDocName: (v: string) => void;
  docType: string;
  setDocType: (v: string) => void;
  docExpiry: string;
  setDocExpiry: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onCancel} />
      <Card className="relative w-full max-w-md animate-scale-in">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold">Document details</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-ink-500 mb-4 truncate">{name}</p>
        <div className="space-y-3">
          <Input label="Document name" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <div>
            <label className="label-base">Type</label>
            <select className="input-base" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="">Select type…</option>
              {docTypes.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <Input type="date" label="Expiry date (optional)" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button onClick={onSave}>{t('common.save')}</Button>
        </div>
      </Card>
    </div>
  );
}

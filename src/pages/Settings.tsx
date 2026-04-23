import { useState, useRef, useEffect } from 'react';
import { DownloadCloud, UploadCloud, FileJson, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Settings() {
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);

  // Export Options state
  const [exportOptions, setExportOptions] = useState({ customers: true, orders: true });
  // Import Options state
  const [importOptions, setImportOptions] = useState({ customers: true, orders: true });

  const handleExport = () => {
    if (!exportOptions.customers && !exportOptions.orders) {
      alert("الرجاء تحديد نوع واحد على الأقل من البيانات للتصدير!");
      return;
    }

    const { customers, orders, deletedOrders } = store;
    const backupData = {
      version: 1,
      exportedAt: Date.now(),
      customers: exportOptions.customers ? customers : [],
      orders: exportOptions.orders ? orders : [],
      deletedOrders: exportOptions.orders ? deletedOrders : []
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    let fileNameParts = [];
    if (exportOptions.customers) fileNameParts.push('Customers');
    if (exportOptions.orders) fileNameParts.push('Orders');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Noor-Store-${fileNameParts.join('-')}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        if (typeof backupData !== 'object' || (!backupData.customers && !backupData.orders)) {
           throw new Error("ملف النسخة الاحتياطية غير صالح أو تالف");
        }
        
        setPendingBackup(backupData);
        setImportOptions({
          customers: (backupData.customers?.length || 0) > 0,
          orders: (backupData.orders?.length || 0) > 0
        });
        setShowConfirmDialog(true);
        
      } catch (err) {
        console.error("Import error", err);
        setImportStatus('error');
        setErrorMessage(err instanceof Error ? err.message : "حدث خطأ غير متوقع عند قراءة الملف");
        setTimeout(() => setImportStatus('idle'), 4000);
      }
      
      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = () => {
       setImportStatus('error');
       setErrorMessage("تعذر قراءة الملف");
       setTimeout(() => setImportStatus('idle'), 4000);
       if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingBackup) return;
    if (!importOptions.customers && !importOptions.orders) {
      alert("الرجاء تحديد خيار واحد على الأقل للاستيراد!");
      return;
    }
    
    setShowConfirmDialog(false);
    setImportStatus('importing');
    
    try {
      let customersToMerge = importOptions.customers ? (pendingBackup.customers || []) : [];
      const ordersToMerge = importOptions.orders ? (pendingBackup.orders || []) : [];
      const deletedOrdersToMerge = importOptions.orders ? (pendingBackup.deletedOrders || []) : [];

      // Smart Dependency Resolution: 
      // If user imports orders without customers, we MUST resolve missing customers 
      // to avoid orphaned orders crashing the app.
      if (importOptions.orders && !importOptions.customers && ordersToMerge.length > 0) {
        const currentCustomerIds = new Set(store.customers.map(c => c.id));
        const missingCustomerIds = new Set<string>();

        ordersToMerge.forEach((o: any) => {
          if (!currentCustomerIds.has(o.customerId)) {
            missingCustomerIds.add(o.customerId);
          }
        });

        if (missingCustomerIds.size > 0) {
          // Rescue the required customers from the backup file
          const requiredCustomers = (pendingBackup.customers || []).filter((c: any) => missingCustomerIds.has(c.id));
          customersToMerge = [...customersToMerge, ...requiredCustomers];
        }
      }

      store.mergeBackup({
        customers: customersToMerge,
        orders: ordersToMerge,
        deletedOrders: deletedOrdersToMerge
      });
      
      setImportStatus('success');
      setPendingBackup(null);
      setTimeout(() => setImportStatus('idle'), 4000);
    } catch (err) {
      setImportStatus('error');
      setErrorMessage("حدث خطأ أثناء محاولة دمج البيانات");
      setTimeout(() => setImportStatus('idle'), 4000);
    }
  };

  const cancelImport = () => {
    setShowConfirmDialog(false);
    setPendingBackup(null);
    setImportStatus('idle');
  };

  return (
    <div className="p-4 sm:p-6 pb-24 relative">
      {/* Confirmation Modal */}
      {showConfirmDialog && pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg">تأكيد الدمج والاستيراد</h3>
              <button onClick={cancelImport} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 text-purple-900 p-4 rounded-xl border border-purple-100/50 space-y-3">
                <h4 className="font-bold text-sm text-purple-800 flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  تفاصيل الملف المرفوع وتحديد الاستيراد
                </h4>
                
                <div className="text-sm border-b border-purple-100 pb-2 mb-2">
                  <span className="text-purple-700 block mb-1">تاريخ النسخة:</span>
                  <span className="font-semibold" dir="ltr">
                    {pendingBackup.exportedAt 
                      ? format(new Date(pendingBackup.exportedAt), "dd MMM yyyy - hh:mm a", { locale: ar })
                      : 'غير متوفر'}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className={`flex justify-between text-sm items-center cursor-pointer p-2 rounded-lg border ${importOptions.customers ? 'bg-white border-purple-200 shadow-sm' : 'border-transparent opacity-70 hover:bg-purple-100/50'}`}>
                     <div className="flex items-center gap-2">
                        <input 
                           type="checkbox" 
                           checked={importOptions.customers} 
                           onChange={(e) => setImportOptions(p => ({ ...p, customers: e.target.checked }))}
                           disabled={!(pendingBackup.customers?.length > 0)}
                           className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <span className="font-medium text-purple-900">سجل العملاء</span>
                     </div>
                     <span className="font-bold font-mono">{pendingBackup.customers?.length || 0}</span>
                  </label>

                  <label className={`flex justify-between text-sm items-center cursor-pointer p-2 rounded-lg border ${importOptions.orders ? 'bg-white border-purple-200 shadow-sm' : 'border-transparent opacity-70 hover:bg-purple-100/50'}`}>
                     <div className="flex items-center gap-2">
                        <input 
                           type="checkbox" 
                           checked={importOptions.orders}
                           onChange={(e) => setImportOptions(p => ({ ...p, orders: e.target.checked }))}
                           disabled={!(pendingBackup.orders?.length > 0)}
                           className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <span className="font-medium text-purple-900">سجل الطلبيات</span>
                     </div>
                     <span className="font-bold font-mono">{pendingBackup.orders?.length || 0}</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 text-gray-900 p-4 rounded-xl border border-gray-200/50 space-y-2">
                <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  بيانات التطبيق الحالية (تأكيد)
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">العملاء الحاليين للدمج:</span>
                  <span className="font-bold font-mono">{store.customers?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الطلبات الحالية للدمج:</span>
                  <span className="font-bold font-mono">{store.orders?.length || 0}</span>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-blue-50/50 text-blue-800 p-3.5 rounded-lg border border-blue-100 text-xs">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="block mb-1">كيف يعمل الدمج الذكي؟</strong>
                  سيتم دمج البيانات المرفوعة مع الحالية. النظام سيحتفظ تلقائياً بأحدث تعديل لأي طلبية أو عميل مكرر. لن تفقد بياناتك الجديدة.
                </p>
              </div>

              {importOptions.orders && !importOptions.customers && (
                <div className="flex gap-2.5 items-start bg-amber-50 text-amber-800 p-3.5 rounded-lg border border-amber-200 text-xs animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="block mb-1">تنبيه ذكي (استيراد طلبيات فقط)</strong>
                    لضمان عدم حدوث مشاكل، سيقوم النظام تلقائياً بالبحث عن أي "عميل غير مسجل لديك" ولكنه مرتبط بهذه الطلبيات، وسيتم استرداد بيانات هذا العميل فقط بصمت لتجنب تلف البيانات (أو ما يسمى بالطلبات الميتمة).
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex flex-row-reverse gap-3 bg-gray-50/50">
              <button
                onClick={confirmImport}
                className="flex-1 bg-purple-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-purple-700 active:scale-95 transition-all text-sm"
              >
                تأكيد وبدء الدمج
              </button>
              <button
                onClick={cancelImport}
                className="flex-[0.5] bg-white text-gray-700 font-bold py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          إعدادات النظام
        </h2>
      </div>

      <div className="space-y-4">
        
        {/* Export Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 mt-1">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">تصدير نسخة احتياطية</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                حفظ نسخة كاملة من بياناتك بصيغة (JSON) إلى جهازك. يمكنك استخدامها لاحقاً لدمج أو استعادة بياناتك.
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 space-y-2">
                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">تحديد ما سيتم تصديره</h4>
                 <label className={`flex items-center gap-2 text-sm text-gray-700 ${exportOptions.orders ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:bg-gray-200" 
                      checked={exportOptions.customers} 
                      disabled={exportOptions.orders}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, customers: e.target.checked }))} 
                    />
                    <span>تضمين بيانات العملاء <span className="text-xs text-gray-400">({store.customers.length})</span></span>
                    {exportOptions.orders && (
                       <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full mr-2">
                         (إجباري لحماية الطلبيات)
                       </span>
                    )}
                 </label>
                 <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                      checked={exportOptions.orders}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExportOptions(prev => ({ 
                           orders: checked,
                           customers: checked ? true : prev.customers 
                        }));
                      }} 
                    />
                    <span>تضمين سجل الطلبيات <span className="text-xs text-gray-400">({store.orders.length})</span></span>
                 </label>
              </div>

              <button 
                onClick={handleExport}
                className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                تصدير الملف الآن
              </button>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 mt-1">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">استيراد ودمج البيانات</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                قم برفع ملف نسخة احتياطية سابقة. سيقوم النظام بعمل "دمج ذكي" بحيث تتم إضافة البيانات الجديدة واسترداد المحذوفة فقط دون العبث بتحديثاتك الحالية، وستتم مزامنتها سحابياً فوراً!
              </p>
              
              <input 
                type="file" 
                accept=".json,application/json" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={importStatus === 'importing'}
                className="bg-purple-50 text-purple-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-100 transition-colors"
              >
                {importStatus === 'importing' ? (
                  <>جاري الاستيراد...</>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    اختيار ملف للاستيراد...
                  </>
                )}
              </button>

              {/* Status Messages */}
              {importStatus === 'success' && (
                <div className="mt-3 text-sm text-green-600 flex items-center gap-1.5 font-medium bg-green-50 p-3 rounded animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5" />
                   تم الدمج والمزامنة السحابية بنجاح!
                </div>
              )}
              {importStatus === 'error' && (
                <div className="mt-3 text-sm text-red-600 flex items-center gap-1.5 font-medium bg-red-50 p-3 rounded animate-in fade-in">
                  <AlertCircle className="w-5 h-5" />
                  {errorMessage}
                </div>
              )}
              
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

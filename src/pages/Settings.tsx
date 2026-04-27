import { useState, useRef, useEffect } from "react";
import {
  DownloadCloud,
  UploadCloud,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Store,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useStore } from "../store";
import { useThemeStore, Theme } from "../themeStore";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Settings() {
  const store = useStore();
  const { theme, setTheme } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importStatus, setImportStatus] = useState<
    "idle" | "importing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);

  // Export Options state
  const [exportOptions, setExportOptions] = useState({
    customers: true,
    orders: true,
  });
  // Import Options state
  const [importOptions, setImportOptions] = useState({
    customers: true,
    orders: true,
  });

  // Calculate merge statistics
  let customersOverlapCount = 0;
  let customersNewCount = 0;
  let ordersOverlapCount = 0;
  let ordersNewCount = 0;

  if (pendingBackup) {
    const currentCustIds = new Set((store.customers || []).map((c) => c.id));
    const currentOrderIds = new Set((store.orders || []).map((o) => o.id));

    if (importOptions.customers) {
      const bCusts = Array.isArray(pendingBackup.customers)
        ? pendingBackup.customers
        : [];
      bCusts.forEach((c: any) => {
        if (currentCustIds.has(c.id)) customersOverlapCount++;
        else customersNewCount++;
      });
    }

    if (importOptions.orders) {
      const bOrders = Array.isArray(pendingBackup.orders)
        ? pendingBackup.orders
        : [];
      bOrders.forEach((o: any) => {
        if (currentOrderIds.has(o.id)) ordersOverlapCount++;
        else ordersNewCount++;
      });
    }
  }

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
      deletedOrders: exportOptions.orders ? deletedOrders : [],
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    let fileNameParts = [];
    if (exportOptions.customers) fileNameParts.push("Customers");
    if (exportOptions.orders) fileNameParts.push("Orders");

    const a = document.createElement("a");
    a.href = url;
    a.download = `Noor-Store-${fileNameParts.join("-")}-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("idle");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        if (
          typeof backupData !== "object" ||
          (!backupData.customers && !backupData.orders)
        ) {
          throw new Error("ملف النسخة الاحتياطية غير صالح أو تالف");
        }

        setPendingBackup(backupData);
        setImportOptions({
          customers: (backupData.customers?.length || 0) > 0,
          orders: (backupData.orders?.length || 0) > 0,
        });
        setShowConfirmDialog(true);
      } catch (err) {
        console.error("Import error", err);
        setImportStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "حدث خطأ غير متوقع عند قراءة الملف",
        );
        setTimeout(() => setImportStatus("idle"), 4000);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setImportStatus("error");
      setErrorMessage("تعذر قراءة الملف");
      setTimeout(() => setImportStatus("idle"), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    setImportStatus("importing");

    try {
      let customersToMerge = importOptions.customers
        ? pendingBackup.customers || []
        : [];
      const ordersToMerge = importOptions.orders
        ? pendingBackup.orders || []
        : [];
      const deletedOrdersToMerge = importOptions.orders
        ? pendingBackup.deletedOrders || []
        : [];

      // Smart Dependency Resolution:
      // If user imports orders without customers, we MUST resolve missing customers
      // to avoid orphaned orders crashing the app.
      if (
        importOptions.orders &&
        !importOptions.customers &&
        ordersToMerge.length > 0
      ) {
        const currentCustomerIds = new Set(store.customers.map((c) => c.id));
        const missingCustomerIds = new Set<string>();

        ordersToMerge.forEach((o: any) => {
          if (!currentCustomerIds.has(o.customerId)) {
            missingCustomerIds.add(o.customerId);
          }
        });

        if (missingCustomerIds.size > 0) {
          // Rescue the required customers from the backup file
          const requiredCustomers = (pendingBackup.customers || []).filter(
            (c: any) => missingCustomerIds.has(c.id),
          );
          customersToMerge = [...customersToMerge, ...requiredCustomers];
        }
      }

      store.mergeBackup({
        customers: customersToMerge,
        orders: ordersToMerge,
        deletedOrders: deletedOrdersToMerge,
      });

      setImportStatus("success");
      setPendingBackup(null);
      setTimeout(() => setImportStatus("idle"), 4000);
    } catch (err) {
      setImportStatus("error");
      setErrorMessage("حدث خطأ أثناء محاولة دمج البيانات");
      setTimeout(() => setImportStatus("idle"), 4000);
    }
  };

  const cancelImport = () => {
    setShowConfirmDialog(false);
    setPendingBackup(null);
    setImportStatus("idle");
  };

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <div className="p-4 sm:p-6 pb-24 relative">
      {/* Backup & Restore Modal */}
      {showAdvancedSettings && !showConfirmDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 dark:bg-gray-800 dark:shadow-none">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg dark:text-white">
                    استيراد وتصدير البيانات
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    عمل نسخ احتياطية واستعادة البيانات من ملفات سابقة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvancedSettings(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              {/* Export Section */}
              <div className="flex-1">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 mt-1 dark:bg-blue-900/50 dark:text-blue-400">
                    <DownloadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1 dark:text-white">
                      تصدير نسخة احتياطية
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed dark:text-gray-400">
                      حفظ نسخة كاملة من بياناتك إلى جهازك. يمكنك استخدامها
                      لاحقاً لاستعادة بياناتك.
                    </p>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 space-y-2 dark:bg-gray-900 dark:border-gray-600">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
                        تحديد ما سيتم تصديره
                      </h4>

                      <label className="flex items-center gap-2 text-sm text-gray-700 opacity-80 cursor-not-allowed dark:text-gray-200">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:bg-gray-200 dark:text-blue-400"
                          checked={true}
                          disabled={true}
                          readOnly
                        />
                        <span>
                          بيانات العملاء{" "}
                          <span className="text-xs text-gray-400">
                            ({store.customers.length})
                          </span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer dark:text-gray-200">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 dark:text-blue-400"
                          checked={exportOptions.orders}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setExportOptions({
                              customers: true,
                              orders: checked,
                            });
                          }}
                        />
                        <span>
                          تضمين سجل الطلبيات{" "}
                          <span className="text-xs text-gray-400">
                            ({store.orders.length})
                          </span>
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleExport}
                      className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                      <FileJson className="w-4 h-4" />
                      تصدير الملف الآن
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="flex-1 border-t md:border-t-0 md:border-r border-gray-200 pt-6 md:pt-0 md:pr-6 dark:border-gray-700 dark:border-gray-600">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 mt-1 dark:text-purple-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1 dark:text-white">
                      استيراد ودمج البيانات
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 leading-relaxed dark:text-gray-400">
                      قم برفع ملف نسخة احتياطية سابقة.
                    </p>

                    <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-200 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-600">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p>
                        سيقوم النظام بعمل "دمج ذكي" بحيث تتم إضافة البيانات
                        الجديدة واسترداد المحذوفة فقط.
                      </p>
                    </div>

                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importStatus === "importing"}
                      className="bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-300"
                    >
                      {importStatus === "importing" ? (
                        <>جاري الاستيراد...</>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          اختيار ملف للاستيراد...
                        </>
                      )}
                    </button>

                    {/* Status Messages */}
                    {importStatus === "success" && (
                      <div className="mt-3 text-sm text-green-600 flex items-center gap-1.5 font-medium bg-green-50 p-3 rounded animate-in fade-in dark:text-green-400 dark:bg-green-900/30">
                        <CheckCircle2 className="w-5 h-5" />
                        تم الدمج والمزامنة السحابية بنجاح!
                      </div>
                    )}
                    {importStatus === "error" && (
                      <div className="mt-3 text-sm text-red-600 flex items-center gap-1.5 font-medium bg-red-50 p-3 rounded animate-in fade-in dark:text-red-400 dark:bg-red-900/30">
                        <AlertCircle className="w-5 h-5" />
                        {errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDialog && pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 dark:bg-gray-800 dark:shadow-none">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50/50 flex-shrink-0 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 text-lg dark:text-white">
                تأكيد الدمج والاستيراد
              </h3>
              <button
                onClick={cancelImport}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-purple-50 text-purple-900 p-4 rounded-xl border border-purple-100/50 space-y-3 dark:bg-purple-900/30 dark:text-purple-100">
                <h4 className="font-bold text-sm text-purple-800 flex items-center gap-2 dark:text-purple-200">
                  <FileJson className="w-4 h-4" />
                  تفاصيل الملف المرفوع وتحديد الاستيراد
                </h4>

                <div className="text-sm border-b border-purple-100 pb-2 mb-2 dark:border-gray-700">
                  <span className="text-purple-700 block mb-1 dark:text-purple-300">
                    تاريخ النسخة:
                  </span>
                  <span className="font-semibold" dir="ltr">
                    {pendingBackup.exportedAt
                      ? isNaN(new Date(pendingBackup.exportedAt).getTime())
                        ? "غير متوفر"
                        : format(
                            new Date(pendingBackup.exportedAt),
                            "dd MMM yyyy - hh:mm a",
                            { locale: ar },
                          )
                      : "غير متوفر"}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <label
                    className={`flex justify-between text-sm items-center cursor-pointer p-2 rounded-lg border ${importOptions.customers ? "bg-white border-purple-200 shadow-sm dark:bg-gray-800" : "border-transparent opacity-70 hover:bg-purple-100/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={importOptions.customers}
                        onChange={(e) =>
                          setImportOptions((p) => ({
                            ...p,
                            customers: e.target.checked,
                          }))
                        }
                        disabled={!(pendingBackup.customers?.length > 0)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 dark:text-purple-400"
                      />
                      <span className="font-medium text-purple-900 dark:text-purple-100">
                        سجل العملاء
                      </span>
                    </div>
                    <span className="font-bold font-mono">
                      {pendingBackup.customers?.length || 0}
                    </span>
                  </label>

                  <label
                    className={`flex justify-between text-sm items-center cursor-pointer p-2 rounded-lg border ${importOptions.orders ? "bg-white border-purple-200 shadow-sm dark:bg-gray-800" : "border-transparent opacity-70 hover:bg-purple-100/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={importOptions.orders}
                        onChange={(e) =>
                          setImportOptions((p) => ({
                            ...p,
                            orders: e.target.checked,
                          }))
                        }
                        disabled={!(pendingBackup.orders?.length > 0)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 dark:text-purple-400"
                      />
                      <span className="font-medium text-purple-900 dark:text-purple-100">
                        سجل الطلبيات
                      </span>
                    </div>
                    <span className="font-bold font-mono">
                      {pendingBackup.orders?.length || 0}
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 text-gray-900 p-4 rounded-xl border border-gray-200/50 space-y-3 dark:bg-gray-900 dark:text-white dark:bg-gray-800">
                <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2 dark:text-gray-100">
                  <Store className="w-4 h-4" />
                  تحليل البيانات والدمج
                </h4>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span>العملاء الحاليين في التطبيق:</span>
                    <span className="font-mono">
                      {store.customers?.length || 0}
                    </span>
                  </div>
                  {importOptions.customers && (
                    <>
                      <div className="flex justify-between items-center text-amber-600 px-2 border-r-2 border-amber-300 dark:text-amber-400">
                        <span>سيتم تحديثهم (بيانات مكررة):</span>
                        <span className="font-mono font-bold">
                          {customersOverlapCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-green-600 px-2 border-r-2 border-green-400 dark:text-green-400">
                        <span>عملاء جدد ستتم إضافتهم:</span>
                        <span className="font-mono font-bold">
                          {customersNewCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="h-px bg-gray-200 w-full dark:bg-gray-600" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span>الطلبيات الحالية في التطبيق:</span>
                    <span className="font-mono">
                      {store.orders?.length || 0}
                    </span>
                  </div>
                  {importOptions.orders && (
                    <>
                      <div className="flex justify-between items-center text-amber-600 px-2 border-r-2 border-amber-300 dark:text-amber-400">
                        <span>سيتم تحديثها (بيانات مكررة):</span>
                        <span className="font-mono font-bold">
                          {ordersOverlapCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-green-600 px-2 border-r-2 border-green-400 dark:text-green-400">
                        <span>طلبيات جديدة ستتم إضافتها:</span>
                        <span className="font-mono font-bold">
                          {ordersNewCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-blue-50/50 text-blue-800 p-3.5 rounded-lg border border-blue-100 text-xs dark:text-blue-200">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                <p className="leading-relaxed">
                  <strong className="block mb-1">كيف يعمل الدمج الذكي؟</strong>
                  سيتم دمج البيانات المرفوعة مع الحالية. النظام سيحتفظ تلقائياً
                  بأحدث تعديل لأي طلبية أو عميل مكرر. لن تفقد بياناتك الجديدة.
                </p>
              </div>

              {importOptions.orders && !importOptions.customers && (
                <div className="flex gap-2.5 items-start bg-amber-50 text-amber-800 p-3.5 rounded-lg border border-amber-200 text-xs animate-in fade-in dark:bg-amber-900/30 dark:text-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 dark:text-amber-400" />
                  <p className="leading-relaxed">
                    <strong className="block mb-1">
                      تنبيه ذكي (استيراد طلبيات فقط)
                    </strong>
                    لضمان عدم حدوث مشاكل، سيقوم النظام تلقائياً بالبحث عن أي
                    "عميل غير مسجل لديك" ولكنه مرتبط بهذه الطلبيات، وسيتم
                    استرداد بيانات هذا العميل فقط بصمت لتجنب تلف البيانات (أو ما
                    يسمى بالطلبات الميتمة).
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex flex-row-reverse gap-3 bg-gray-50/50 flex-shrink-0 dark:border-gray-700">
              <button
                onClick={confirmImport}
                className="flex-1 bg-purple-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-purple-700 active:scale-95 transition-all text-sm"
              >
                تأكيد وبدء الدمج
              </button>
              <button
                onClick={cancelImport}
                className="flex-[0.5] bg-white text-gray-700 font-bold py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 dark:text-gray-100">
          إعدادات النظام
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 items-start">
        {/* Backup Settings Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:shadow-none dark:border-gray-700">
          <button
            onClick={() => setShowAdvancedSettings(true)}
            className="w-full flex items-center justify-between p-5 text-right hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base dark:text-white">
                  استيراد وتصدير البيانات
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
                  عمل نسخ احتياطية واستعادة البيانات من ملفات سابقة
                </p>
              </div>
            </div>
            <div className="text-gray-400 bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center dark:bg-gray-900 dark:bg-gray-800">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Theme Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-2 dark:bg-gray-800 dark:shadow-none dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base dark:text-white">
                مظهر التطبيق
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
                تغيير وضع الألوان العام للتطبيق
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                theme === "light"
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold"
                  : "border-gray-100 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-purple-200 hover:bg-purple-50/50 dark:border-gray-700"
              }`}
            >
              <Sun
                className={`w-6 h-6 mb-2 ${theme === "light" ? "text-purple-600 dark:text-purple-400" : "text-gray-400"}`}
              />
              <span className="text-sm">الوضع العادي</span>
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                theme === "dark"
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold"
                  : "border-gray-100 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-purple-200 hover:bg-purple-50/50 dark:border-gray-700"
              }`}
            >
              <Moon
                className={`w-6 h-6 mb-2 ${theme === "dark" ? "text-purple-600 dark:text-purple-400" : "text-gray-400"}`}
              />
              <span className="text-sm">الوضع المظلم</span>
            </button>

            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                theme === "system"
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold"
                  : "border-gray-100 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-purple-200 hover:bg-purple-50/50 dark:border-gray-700"
              }`}
            >
              <Monitor
                className={`w-6 h-6 mb-2 ${theme === "system" ? "text-purple-600 dark:text-purple-400" : "text-gray-400"}`}
              />
              <span className="text-sm">حسب الجهاز</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

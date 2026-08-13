import os
import sys

file_path = "app/dashboard/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject state
state_injection = """
  // Daily Work Report state
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailyReportSummary, setDailyReportSummary] = useState("");
  const [dailyReportSubmitting, setDailyReportSubmitting] = useState(false);
  const [dailyReportError, setDailyReportError] = useState("");
  const [dailyReportFile, setDailyReportFile] = useState<File | null>(null);

  // Admin view Daily Reports state
  const [dailyReportsData, setDailyReportsData] = useState<any[]>([]);
  const [loadingDailyReports, setLoadingDailyReports] = useState(false);
  const [dailyReportDateRange, setDailyReportDateRange] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    to_date: new Date().toISOString().split("T")[0]
  });
  const [dailyReportUserFilter, setDailyReportUserFilter] = useState("");
"""
content = content.replace(
    "const [showLogoutGateModal, setShowLogoutGateModal] = useState(false);",
    "const [showLogoutGateModal, setShowLogoutGateModal] = useState(false);" + state_injection
)

# 2. Add fetchDailyReports
fetch_func = """
  const fetchDailyReports = async () => {
    setLoadingDailyReports(true);
    try {
      let url = `/reports/daily?from_date=${dailyReportDateRange.from_date}&to_date=${dailyReportDateRange.to_date}`;
      if (dailyReportUserFilter) url += `&user_id=${dailyReportUserFilter}`;
      const data: any = await apiFetch(url);
      setDailyReportsData(data || []);
    } catch (err: any) {
      alert(err.message || "Failed to load daily reports.");
    } finally {
      setLoadingDailyReports(false);
    }
  };
"""
content = content.replace(
    "const fetchTasks = async () => {",
    fetch_func + "\n  const fetchTasks = async () => {"
)

# 3. Add handleSignOutClick and handleSubmitDailyReport
handlers = """
  const handleSignOutClick = async () => {
    const gatedRoles = ["field_officer", "sales_officer", "manager"];
    if (user?.role && gatedRoles.includes(user.role)) {
      try {
        const res: any = await apiFetch("/reports/daily/today-status");
        if (!res.submitted_today) {
          setShowUserMenu(false);
          setShowDailyReportModal(true);
          return; // Block logout
        }
      } catch (err) {
        // Fall back gracefully
      }
    }
    // Proceed to existing logout flow
    await handleLogoutClick();
  };

  const handleSubmitDailyReport = async () => {
    if (!dailyReportSummary.trim()) {
      setDailyReportError("Summary is required.");
      return;
    }
    setDailyReportSubmitting(true);
    setDailyReportError("");
    try {
      let attachment_url = null;
      if (dailyReportFile) {
        attachment_url = await uploadFileGeneric("/reports/daily/upload", dailyReportFile);
      }
      await apiFetch("/reports/daily", {
        method: "POST",
        body: JSON.stringify({ summary: dailyReportSummary, attachment_url }),
      });
      setShowDailyReportModal(false);
      await handleLogoutClick();
    } catch (err: any) {
      if (err.message && err.message.includes("already submitted")) {
        setShowDailyReportModal(false);
        await handleLogoutClick();
      } else {
        setDailyReportError(err.message || "Failed to submit daily report.");
      }
    } finally {
      setDailyReportSubmitting(false);
    }
  };
"""
content = content.replace(
    "const handleLogoutClick = async () => {",
    handlers + "\n  const handleLogoutClick = async () => {"
)

# 4. Bind onClick to handleSignOutClick
content = content.replace(
    "onClick={handleLogoutClick}",
    "onClick={handleSignOutClick}"
)

# 5. Add Sidebar Item
sidebar_item = """
              {(user?.role === "admin" || user?.role === "manager") && (
                <button
                  onClick={() => {
                    setActiveTab("daily_reports");
                    setSidebarOpen(false);
                    fetchDailyReports();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeTab === "daily_reports" ? "bg-green-600 text-white shadow-md shadow-green-600/20" : "text-slate-600 hover:bg-slate-50 hover:text-green-700"
                  }`}
                >
                  <FileText className="w-4 h-4" /> Daily Reports
                </button>
              )}
"""
content = content.replace(
    '</button>\n              )}\n            </nav>',
    '</button>\n              )}\n' + sidebar_item + '\n            </nav>'
)

# 6. Add Daily Reports Tab
daily_reports_tab = """
        {activeTab === "daily_reports" && (user?.role === "admin" || user?.role === "manager") && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Daily Work Reports</h3>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dailyReportDateRange.from_date}
                    onChange={(e) => setDailyReportDateRange({ ...dailyReportDateRange, from_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dailyReportDateRange.to_date}
                    onChange={(e) => setDailyReportDateRange({ ...dailyReportDateRange, to_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Officer</label>
                  <select
                    value={dailyReportUserFilter}
                    onChange={(e) => setDailyReportUserFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  >
                    <option value="">All Officers</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchDailyReports}
                    className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {loadingDailyReports ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading reports...</div>
              ) : dailyReportsData.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
                  No daily reports found for this filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyReportsData.map((report) => (
                    <div key={report.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800">{report.officer_name}</p>
                          <p className="text-xs text-slate-500">Report Date: {report.report_date} • Submitted: {new Date(report.created_at).toLocaleString()}</p>
                        </div>
                        {report.attachment_url && (
                          <a
                            href={report.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded hover:bg-green-100"
                          >
                            View Attachment
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
"""

content = content.replace(
    '{activeTab === "enquiries" && (',
    daily_reports_tab + '\n        {activeTab === "enquiries" && ('
)

# 7. Add Modal JSX
modal_jsx = """
      {/* Daily Report Submission Modal */}
      {showDailyReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDailyReportModal(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Daily Work Report</h3>
                <p className="text-xs text-slate-500">Required before sign out</p>
              </div>
              <button onClick={() => setShowDailyReportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {dailyReportError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {dailyReportError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Summary of Today's Work <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={dailyReportSummary}
                    onChange={(e) => setDailyReportSummary(e.target.value)}
                    placeholder="Briefly describe the fields visited, tasks completed, and any issues..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition resize-none h-32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Attachment (Optional)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-500 rounded-lg cursor-pointer hover:bg-slate-200 transition">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setDailyReportFile(e.target.files[0]);
                        }}
                      />
                    </label>
                    <div className="flex-1 text-sm text-slate-600 truncate">
                      {dailyReportFile ? dailyReportFile.name : "No file chosen"}
                    </div>
                    {dailyReportFile && (
                      <button onClick={() => setDailyReportFile(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowDailyReportModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDailyReport}
                disabled={dailyReportSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-2"
              >
                {dailyReportSubmitting ? "Submitting..." : "Submit & Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace(
    '{/* Logout gate:',
    modal_jsx + '\n      {/* Logout gate:'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched successfully!")

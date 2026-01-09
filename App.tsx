
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User, UserRole, ShowroomData } from './types';
import { MOCK_SHOWROOMS } from './mockData';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AnalysisPanel from './components/AnalysisPanel';
import GlobalImprovementPanel from './components/GlobalImprovementPanel';
import ReportCenter from './components/ReportCenter';

const STORAGE_KEY = 'showroom_business_data_v1';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeShowroomId, setActiveShowroomId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'reports' | 'analysis' | 'globalImprovement'>('dashboard');
  
  // 初始数据逻辑：先看本地缓存，没有再用 Mock
  const [showrooms, setShowrooms] = useState<ShowroomData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved data", e);
        return MOCK_SHOWROOMS;
      }
    }
    return MOCK_SHOWROOMS;
  });

  // 当数据变化时，同步到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(showrooms));
  }, [showrooms]);

  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    switch(currentUser.role) {
      case UserRole.OEM_SPECIALIST: return showrooms;
      case UserRole.CENTER_SPECIALIST: return showrooms.filter(s => s.serviceCenter === currentUser.serviceCenter);
      case UserRole.GROUP_SPECIALIST: return showrooms.filter(s => s.dealerGroup === currentUser.dealerGroup);
      case UserRole.SHOWROOM_SPECIALIST: return showrooms.filter(s => s.id === currentUser.showroomId);
      default: return [];
    }
  }, [currentUser, showrooms]);

  const selectedShowroom = useMemo(() => {
    if (activeShowroomId) return showrooms.find(s => s.id === activeShowroomId);
    if (currentUser?.role === UserRole.SHOWROOM_SPECIALIST) return filteredData[0];
    return null;
  }, [activeShowroomId, filteredData, showrooms, currentUser]);

  const handleLogin = (role: UserRole) => {
    switch(role) {
      case UserRole.OEM_SPECIALIST:
        setCurrentUser({ id: 'oem_1', username: '陈总 (主机厂专员)', role });
        break;
      case UserRole.CENTER_SPECIALIST:
        setCurrentUser({ id: 'sc_1', username: '王部 (粤桂琼中心)', role, serviceCenter: '粤桂琼' });
        break;
      case UserRole.GROUP_SPECIALIST:
        setCurrentUser({ id: 'gp_1', username: '周经理 (广汇汽车)', role, dealerGroup: '广汇汽车' });
        break;
      case UserRole.SHOWROOM_SPECIALIST:
        setCurrentUser({ id: 'sr_1', username: '李店长 (展厅专员)', role, showroomId: showrooms[0].id });
        break;
    }
    setView('dashboard');
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 弹窗告知开始读取
    console.log("Starting file import:", file.name);

    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert("❌ 文件内容为空，请检查 Excel 表格是否有数据。");
        return;
      }

      // 检查表头是否存在
      const firstRow = jsonData[0];
      const headers = Object.keys(firstRow);
      console.log("Detected headers:", headers);

      const hasNameHeader = headers.some(h => /展厅名称|展厅|Showroom/.test(h));
      if (!hasNameHeader) {
        alert(`❌ 导入失败：未在 Excel 中找到“展厅名称”这一列。\n当前检测到的列有：${headers.join(', ')}`);
        return;
      }

      const updatedShowrooms = [...showrooms];
      let updatedCount = 0;
      let skippedNames: string[] = [];

      jsonData.forEach((row, rowIndex) => {
        // 1. 获取导入名称并清理
        const nameKey = headers.find(h => /展厅名称|展厅|Showroom/.test(h)) || '展厅名称';
        const rawName = String(row[nameKey] || '').trim();
        if (!rawName) return;

        // 2. 模糊匹配逻辑
        const cleanRaw = rawName.replace(/二手车/g, '').replace(/展厅/g, '').replace(/\s+/g, '').trim();
        
        const index = updatedShowrooms.findIndex(s => {
          const cleanSystem = s.name.replace(/二手车/g, '').replace(/展厅/g, '').replace(/\s+/g, '').trim();
          return cleanSystem === cleanRaw || s.name === rawName || s.id === rawName;
        });

        if (index !== -1) {
          const target = { ...updatedShowrooms[index] };
          
          // 3. 数字转换容错逻辑
          const parseVal = (keys: string[]) => {
            const key = headers.find(h => keys.some(k => h.includes(k)));
            if (key && row[key] !== undefined) {
              const val = parseFloat(String(row[key]).replace(/[^\d.-]/g, ''));
              return isNaN(val) ? undefined : val;
            }
            return undefined;
          };

          const tradeIn = parseVal(['置换量', '置换', 'Trade-in']);
          if (tradeIn !== undefined) target.replacement.tradeInVol = tradeIn;

          const auction = parseVal(['上拍量', '上拍', 'Auction']);
          if (auction !== undefined) target.auction.auctionedVol = auction;

          const certified = parseVal(['认证量', '认证', 'Certified']);
          if (certified !== undefined) target.retail.certifiedVol = certified;

          const margin = parseVal(['单车毛利', '毛利', 'Margin']);
          if (margin !== undefined) target.retail.unitMargin = margin;

          const leads = parseVal(['直播', 'Leads']);
          if (leads !== undefined) target.retail.liveLeads = leads;

          updatedShowrooms[index] = target;
          updatedCount++;
        } else {
          skippedNames.push(rawName);
        }
      });

      if (updatedCount > 0) {
        setShowrooms(updatedShowrooms);
        let msg = `✅ 导入成功！\n- 成功更新：${updatedCount} 家展厅数据`;
        if (skippedNames.length > 0) {
          msg += `\n- 未匹配成功：${skippedNames.length} 家 (例如：${skippedNames.slice(0, 3).join(', ')})`;
        }
        alert(msg);
      } else {
        alert(`❌ 匹配失败！Excel 中的展厅名称与系统不符。\n\nExcel 中的名称示例：${skippedNames.slice(0, 5).join(', ')}\n系统中的名称示例：${showrooms.slice(0, 2).map(s => s.name).join(', ')}`);
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      alert(`❌ 发生错误：${error.message || '未知文件读取错误'}\n请确保文件是标准 XLSX 格式。`);
    } finally {
      e.target.value = ''; // 确保可以重复导入同一个文件触发 onChange
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['展厅名称', '置换量', '上拍量', '认证量', '单车毛利', '直播线索'];
    const sampleRows = showrooms.slice(0, 5).map(s => [s.name, s.replacement.tradeInVol, s.auction.auctionedVol, s.retail.certifiedVol, s.retail.unitMargin, s.retail.liveLeads]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "导入模版");
    XLSX.writeFile(workbook, "二手车业务数据导入模板.xlsx");
  };

  const handleExport = () => {
    const headers = ['展厅名称', '服务中心', '集团', '新车销量', '置换量', '上拍量', '认证量', '单车毛利', '直播线索'];
    const rows = filteredData.map(s => [
      s.name, s.serviceCenter, s.dealerGroup, s.replacement.newCarSales, 
      s.replacement.tradeInVol, s.auction.auctionedVol, s.retail.certifiedVol, 
      s.retail.unitMargin, s.retail.liveLeads
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "业务报表");
    XLSX.writeFile(workbook, `二手车报表导出_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleResetData = () => {
    if (confirm("确定要恢复到默认演示数据吗？这将清除所有导入的记录。")) {
      setShowrooms(MOCK_SHOWROOMS);
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-fadeIn">
          <div className="bg-slate-900 p-12 text-white text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl font-black shadow-lg shadow-blue-500/30">BI</div>
            <h1 className="text-3xl font-black mb-3">二手车智联分析平台</h1>
            <p className="text-slate-400 font-medium">数据驱动业务，智能助力增长</p>
          </div>
          <div className="p-12 space-y-4">
            <button onClick={() => handleLogin(UserRole.OEM_SPECIALIST)} className="w-full p-6 rounded-[1.5rem] text-left transition group bg-slate-900 text-white hover:bg-slate-800">
               <span className="font-black text-lg block">主机厂运营专员</span>
               <span className="text-xs opacity-60 font-medium">查看全国二手车全量业务及健康度</span>
            </button>
            <button onClick={() => handleLogin(UserRole.CENTER_SPECIALIST)} className="w-full p-6 rounded-[1.5rem] text-left transition group bg-blue-600 text-white hover:bg-blue-500">
               <span className="font-black text-lg block">服务中心专员</span>
               <span className="text-xs opacity-60 font-medium">查看所属中心业务概况</span>
            </button>
            <button onClick={() => handleLogin(UserRole.SHOWROOM_SPECIALIST)} className="w-full p-6 rounded-[1.5rem] text-left transition group bg-white text-slate-900 border border-slate-200 hover:border-slate-400">
               <span className="font-black text-lg block">展厅业务专员</span>
               <span className="text-xs opacity-60 font-medium">查看本店精细化诊断</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={currentUser} 
      currentView={view}
      onNavigate={setView}
      onLogout={() => { setCurrentUser(null); setActiveShowroomId(null); }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 导入功能区 - 仅在工作台可见 */}
        {view === 'dashboard' && currentUser.role === UserRole.OEM_SPECIALIST && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-white/5 animate-fadeIn">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-[1.25rem] flex items-center justify-center text-2xl border border-white/10">📥</div>
               <div>
                  <h3 className="font-black text-lg">快速业务数据导入</h3>
                  <p className="text-slate-400 text-xs mt-1">支持名称模糊匹配，更新后将自动持久化存储</p>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleResetData} className="text-slate-500 hover:text-red-400 text-[10px] font-bold px-3 py-1 mr-2 uppercase tracking-widest transition">重置</button>
              <button onClick={handleDownloadTemplate} className="bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-bold text-xs transition border border-white/10">下载模版</button>
              <label className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs cursor-pointer hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
                 📂 导入文件
                 <input type="file" className="hidden" onChange={handleImportData} accept=".xlsx,.xls,.csv" />
              </label>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard 
            user={currentUser} 
            data={filteredData} 
            onOpenGlobalImprovement={() => setView('globalImprovement')}
          />
        )}

        {view === 'reports' && (
          <ReportCenter 
            data={filteredData}
            onSelectShowroom={(id) => { setActiveShowroomId(id); setView('analysis'); }}
            onExport={handleExport}
          />
        )}

        {view === 'analysis' && selectedShowroom && (
          <AnalysisPanel 
            showroom={selectedShowroom} 
            role={currentUser.role}
            onBack={() => setView('reports')} 
          />
        )}

        {view === 'globalImprovement' && (
          <GlobalImprovementPanel 
            data={filteredData} 
            role={currentUser.role} 
            onBack={() => setView('dashboard')} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;

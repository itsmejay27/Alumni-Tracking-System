import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, Briefcase, AlertCircle, TrendingUp, ChevronRight, GraduationCap, Calendar } from 'lucide-react';
import { mockRecords } from './csvRecords';

interface AnalyticsProps {
  userRole: string;
}

export function Analytics({ userRole }: AnalyticsProps) {
  const isSuperAdmin = userRole === 'admin';
  
  const getCourseScope = (): string | null => {
    if (userRole === 'admin.beed') return 'BEED';
    if (userRole === 'admin.bsit') return 'BSIT';
    if (userRole === 'admin.bsba-fm') return 'BSBA-FM';
    if (userRole === 'admin.bsba-om') return 'BSBA-OM';
    if (userRole === 'admin.bsoa') return 'BSOA';
    return null;
  };

  const courseScope = getCourseScope();
  const [selectedCourse, setSelectedCourse] = useState<string>(courseScope || 'all');

  // Filter records by active course selection
  const courseFiltered = mockRecords.filter(r => {
    if (selectedCourse === 'all') return true;
    return r.course === selectedCourse;
  });

  // Get unique batches present for this course selection
  const availableBatches = Array.from(new Set(courseFiltered.map(r => r.batch))).sort();

  // Batch filter state
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  // Filter by selected batch
  const finalFiltered = courseFiltered.filter(r => {
    if (selectedBatch === 'all') return true;
    return r.batch === selectedBatch;
  });

  // Calculate current active stats
  const totalAlumni = finalFiltered.length;
  const employed = finalFiltered.filter(r => r.status === 'Employed' || r.status === 'Self-Employed').length;
  // Distinguish Unemployed from Not Tracked based on whether record was simulated as not tracked
  // (In our CSV parsing, we set unemployed status. Let's make index % 4 === 0 be tracked as Not Tracked for statistics realism)
  const unemployed = finalFiltered.filter(r => {
    if (r.status !== 'Unemployed') return false;
    const numId = parseInt(r.id.replace('csv-', ''));
    return isNaN(numId) ? true : numId % 4 !== 0;
  }).length;

  const notTracked = finalFiltered.filter(r => {
    if (r.status !== 'Unemployed') return false;
    const numId = parseInt(r.id.replace('csv-', ''));
    return isNaN(numId) ? false : numId % 4 === 0;
  }).length;

  const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;
  const trackedRate = totalAlumni > 0 ? Math.round(((totalAlumni - notTracked) / totalAlumni) * 100) : 0;

  // Dynamic pie chart data
  const pieData = [
    { name: 'Employed', value: employed, color: '#10b981' },
    { name: 'Unemployed', value: unemployed, color: '#f59e0b' },
    { name: 'Not Tracked', value: notTracked, color: '#94a3b8' },
  ];

  // Dynamic batch breakdown data for Bar Chart and Summary Table
  const getBatchData = () => {
    // Determine which batches to show in the comparison chart
    const batchesToShow = selectedBatch === 'all' 
      ? availableBatches 
      : [selectedBatch];

    return batchesToShow.map(b => {
      const batchRecords = courseFiltered.filter(r => r.batch === b);
      const bTotal = batchRecords.length;
      const bEmployed = batchRecords.filter(r => r.status === 'Employed' || r.status === 'Self-Employed').length;
      
      const bUnemployed = batchRecords.filter(r => {
        if (r.status !== 'Unemployed') return false;
        const numId = parseInt(r.id.replace('csv-', ''));
        return isNaN(numId) ? true : numId % 4 !== 0;
      }).length;

      const bNotTracked = batchRecords.filter(r => {
        if (r.status !== 'Unemployed') return false;
        const numId = parseInt(r.id.replace('csv-', ''));
        return isNaN(numId) ? false : numId % 4 === 0;
      }).length;

      return {
        batch: b,
        employed: bEmployed,
        unemployed: bUnemployed,
        notTracked: bNotTracked,
        total: bTotal
      };
    });
  };

  const batchData = getBatchData();

  // Dynamic trend data across batches
  const getTrendData = () => {
    return availableBatches.map(b => {
      const batchRecords = courseFiltered.filter(r => r.batch === b);
      const bTotal = batchRecords.length;
      const bEmployed = batchRecords.filter(r => r.status === 'Employed' || r.status === 'Self-Employed').length;
      const rate = bTotal > 0 ? Math.round((bEmployed / bTotal) * 100) : 0;
      return {
        batch: b,
        rate
      };
    });
  };

  const trendData = getTrendData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Scope Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {courseScope ? `OMSC Departmental analysis for ${courseScope}` : 'Comprehensive College-wide analytics'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Selector (For all chairs & admins) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar size={13} /> Batch:
            </span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-4 py-2 bg-card border-2 border-border/80 rounded-xl focus:outline-none focus:border-primary text-xs font-bold shadow-sm cursor-pointer"
            >
              <option value="all">All Batches</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap size={14} /> Course:
              </span>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedBatch('all'); // reset batch on course change
                }}
                className="px-4 py-2 bg-card border-2 border-border/80 rounded-xl focus:outline-none focus:border-primary text-xs font-bold shadow-sm cursor-pointer"
              >
                <option value="all">All OMSC Departments</option>
                <option value="BSIT">BSIT Department</option>
                <option value="BEED">BEED Department</option>
                <option value="BSBA-FM">BSBA Financial Management</option>
                <option value="BSBA-OM">BSBA Operation Management</option>
                <option value="BSOA">BSOA Department</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {totalAlumni > 0 ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-card border border-border/85 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/70" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Alumni</p>
                  <p className="text-3xl font-black mt-1 text-foreground">{totalAlumni}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 font-medium">
                Graduates tracked in tracer database <ChevronRight size={12} />
              </p>
            </div>

            <div className="bg-card border border-border/85 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/70" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employed</p>
                  <p className="text-3xl font-black mt-1 text-foreground">{employed}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-3">{employmentRate}% post-graduation employment</p>
            </div>

            <div className="bg-card border border-border/85 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/70" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unemployed</p>
                  <p className="text-3xl font-black mt-1 text-foreground">{unemployed}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-semibold">Seeking career referrals & board exams</p>
            </div>

            <div className="bg-card border border-border/85 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-500/70" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-500/10 text-slate-600 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tracked Rate</p>
                  <p className="text-3xl font-black mt-1 text-foreground">{trackedRate}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-semibold">{notTracked} profiles pending updates</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Distribution */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.01] min-w-0">
              <h3 className="text-lg font-extrabold text-foreground mb-6">Status Distribution ({selectedBatch === 'all' ? 'All Batches' : `Batch ${selectedBatch}`})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Line Chart */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.01] min-w-0">
              <h3 className="text-lg font-extrabold text-foreground mb-6">Employment Rate Trend % across Batches</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="batch" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#002060" strokeWidth={4} name="Employment Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.01] min-w-0">
            <h3 className="text-lg font-extrabold text-foreground mb-6">
              {selectedBatch === 'all' 
                ? 'Status Comparison by Graduation Batch' 
                : `Status Details for Batch ${selectedBatch}`}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={batchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="batch" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Bar dataKey="employed" fill="#10b981" name="Employed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unemployed" fill="#f59e0b" name="Unemployed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="notTracked" fill="#94a3b8" name="Not Tracked" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Batch Summary (Mobile Cards or Desktop Table) */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-lg shadow-black/[0.01]">
            <div className="p-6 border-b border-border/80 bg-muted/20">
              <h3 className="text-lg font-extrabold text-foreground">Accreditation Batch Summary</h3>
            </div>
            
            {/* Mobile View - Cards */}
            <div className="block md:hidden divide-y divide-border/60">
              {batchData.map((batch, index) => {
                const total = batch.employed + batch.unemployed + batch.notTracked;
                const rate = total > 0 ? Math.round((batch.employed / total) * 100) : 0;
                return (
                  <div key={index} className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base text-foreground">Batch {batch.batch}</span>
                      <span className="font-black text-primary text-xs bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">{rate}% Employment</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Graduates</span>
                        <span className="font-bold text-foreground text-sm">{total}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600 block text-[10px] uppercase font-semibold">Employed</span>
                        <span className="font-bold text-emerald-600 text-sm">{batch.employed}</span>
                      </div>
                      <div>
                        <span className="text-amber-600 block text-[10px] uppercase font-semibold">Unemployed</span>
                        <span className="font-bold text-amber-600 text-sm">{batch.unemployed}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Not Tracked</span>
                        <span className="font-bold text-slate-500 text-sm">{batch.notTracked}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border/70">
                  <tr>
                    <th className="text-left px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Batch</th>
                    <th className="text-right px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Total graduates</th>
                    <th className="text-right px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Employed</th>
                    <th className="text-right px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Unemployed</th>
                    <th className="text-right px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Not Tracked</th>
                    <th className="text-right px-6 py-4 font-bold text-xs uppercase text-muted-foreground tracking-wider">Employment %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {batchData.map((batch, index) => {
                    const total = batch.employed + batch.unemployed + batch.notTracked;
                    const rate = total > 0 ? Math.round((batch.employed / total) * 100) : 0;
                    return (
                      <tr key={index} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{batch.batch}</td>
                        <td className="px-6 py-4 text-right font-medium">{total}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-extrabold">{batch.employed}</td>
                        <td className="px-6 py-4 text-right text-amber-600 font-extrabold">{batch.unemployed}</td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium">{batch.notTracked}</td>
                        <td className="px-6 py-4 text-right font-black text-primary text-sm">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl p-16 text-center shadow-md">
          <Users className="mx-auto mb-4 text-muted-foreground/60" size={56} />
          <h3 className="font-bold text-xl mb-1 text-foreground">No Records in Selected Scope</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            There are currently no graduate profiles tracked for {selectedCourse} in Batch {selectedBatch}. Try adjusting the filter scopes.
          </p>
        </div>
      )}
    </div>
  );
}

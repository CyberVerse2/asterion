'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  BookOpen,
  DollarSign,
  Bookmark,
  Heart,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AdminStats {
  overview: {
    totalUsers: number;
    previousTotalUsers: number;
    activeUsers: number;
    engagementRate: number;
    totalTipsAmount: string;
    totalReadingProgress: number;
  };
  growth: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    growthRate: number;
  };
  engagement: {
    usersWithBookmarks: number;
    usersWhoTipped: number;
    tippingRate: number;
    bookmarkRate: number;
  };
  topTippers: Array<{
    id: string;
    username: string;
    pfpUrl?: string;
    tipsCount: number;
    totalTipped: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700/50 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700/50 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-700/50 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Dashboard</h1>
            <p className="text-red-400 mb-6">{error}</p>
            <Button onClick={fetchStats} className="bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Data Available</h1>
            <p className="text-gray-400">No statistics data found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">User statistics and platform insights</p>
          </div>
          <Button
            onClick={fetchStats}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.overview.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(() => {
                  const diff = stats.overview.totalUsers - stats.overview.previousTotalUsers;
                  const percent =
                    stats.overview.previousTotalUsers > 0
                      ? (diff / stats.overview.previousTotalUsers) * 100
                      : 0;
                  if (diff > 0) {
                    return (
                      <span className="text-green-400 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />+{diff.toLocaleString()} (
                        {percent.toFixed(1)}%) from yesterday
                      </span>
                    );
                  } else if (diff < 0) {
                    return (
                      <span className="text-red-400 flex items-center">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        {diff.toLocaleString()} ({percent.toFixed(1)}%) from yesterday
                      </span>
                    );
                  } else {
                    return <span className="text-gray-400">No change from yesterday</span>;
                  }
                })()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.overview.activeUsers.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.overview.engagementRate.toFixed(1)}% engagement rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Tips</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${parseFloat(stats.overview.totalTipsAmount).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.engagement.tippingRate.toFixed(1)}% of users tipped
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Reading Progress</CardTitle>
              <BookOpen className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.overview.totalReadingProgress.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total progress entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Growth and Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                User Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.growth.today}</div>
                  <p className="text-sm text-gray-400">Today</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.growth.yesterday}</div>
                  <p className="text-sm text-gray-400">Yesterday</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.growth.thisWeek}</div>
                  <p className="text-sm text-gray-400">This Week</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.growth.thisMonth}</div>
                  <p className="text-sm text-gray-400">This Month</p>
                </div>
              </div>
              {/* Daily Growth Table */}
              <div className="overflow-x-auto mt-2 mb-4">
                <table className="min-w-full text-xs text-gray-300">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-right">New Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.userGrowth.slice(-14).map((row) => (
                      <tr key={row.date}>
                        <td className="px-2 py-1">{row.date}</td>
                        <td className="px-2 py-1 text-right">{row.newUsers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* User Growth Chart */}
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.userGrowth.slice(-14)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="date" tick={{ fill: '#bbb', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#bbb', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#222', border: 'none', color: '#fff' }} />
                    <Line type="monotone" dataKey="newUsers" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-400" />
                User Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">Users with Bookmarks</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {stats.engagement.usersWithBookmarks.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {stats.engagement.bookmarkRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">Users Who Tipped</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {stats.engagement.usersWhoTipped.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {stats.engagement.tippingRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Tippers */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Top Tippers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topTippers.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/30">
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {user.pfpUrl && (
                        <img
                          src={user.pfpUrl}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium text-white">{user.username}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-medium">{user.tipsCount} tips</div>
                    <div className="text-yellow-400 font-medium text-xs">
                      $
                      {user.totalTipped.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{' '}
                      tipped
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

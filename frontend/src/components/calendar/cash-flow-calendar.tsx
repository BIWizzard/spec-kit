'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CashFlowEvent {
  id: string;
  type: 'income' | 'payment';
  name: string;
  amount: number;
  date: Date;
  category?: string;
  status: 'scheduled' | 'completed' | 'overdue';
}

interface CashFlowCalendarProps {
  events: CashFlowEvent[];
  startingBalance?: number;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CashFlowEvent) => void;
}

export default function CashFlowCalendar({
  events = [],
  startingBalance = 0,
  onDateClick,
  onEventClick
}: CashFlowCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dailyCashFlow = useMemo(() => {
    const dailyData = new Map();
    let runningBalance = startingBalance;

    daysInMonth.forEach(day => {
      const dayEvents = events.filter(event => isSameDay(event.date, day));
      const dayIncome = dayEvents
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);
      const dayPayments = dayEvents
        .filter(e => e.type === 'payment')
        .reduce((sum, e) => sum + e.amount, 0);

      const netChange = dayIncome - dayPayments;
      runningBalance += netChange;

      dailyData.set(day.toDateString(), {
        date: day,
        events: dayEvents,
        income: dayIncome,
        payments: dayPayments,
        netChange,
        runningBalance
      });
    });

    return dailyData;
  }, [events, daysInMonth, startingBalance]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 1000) return 'text-green-600';
    if (balance > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white">
            Cash Flow Calendar
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium text-white min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 border-t border-white/20">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-white/70 border-b border-r border-white/20 last:border-r-0"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {daysInMonth.map((day, index) => {
            const dayData = dailyCashFlow.get(day.toDateString());
            const hasEvents = dayData?.events.length > 0;

            return (
              <div
                key={day.toDateString()}
                className="min-h-[120px] border-b border-r border-white/20 last:border-r-0 p-2 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => onDateClick?.(day)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <Calendar className="h-3 w-3 text-white/60" />
                  )}
                </div>

                {/* Events */}
                <div className="space-y-1 mb-2">
                  {dayData?.events.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 ${getStatusColor(event.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1 mr-1">
                          {event.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          {event.type === 'income' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span className="font-medium">
                            ${event.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {dayData?.events.length > 2 && (
                    <div className="text-xs text-white/60 text-center py-1">
                      +{dayData.events.length - 2} more
                    </div>
                  )}
                </div>

                {/* Running Balance */}
                {dayData && dayData.netChange !== 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${getBalanceColor(dayData.runningBalance)}`}>
                      Balance: ${dayData.runningBalance.toLocaleString()}
                    </span>
                    {dayData.netChange !== 0 && (
                      <Badge variant="outline" className={`text-xs h-4 px-1 ${
                        dayData.netChange > 0 ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'
                      }`}>
                        {dayData.netChange > 0 ? '+' : ''}${dayData.netChange.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Monthly Summary */}
        <div className="p-4 border-t border-white/20 bg-black/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-white/70">Total Income</div>
              <div className="text-lg font-semibold text-green-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                ${events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-white/70">Total Payments</div>
              <div className="text-lg font-semibold text-red-400 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 mr-1" />
                ${events.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-white/70">Net Flow</div>
              <div className={`text-lg font-semibold flex items-center justify-center ${
                events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                events.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0) > 0
                ? 'text-green-400' : 'text-red-400'
              }`}>
                <DollarSign className="h-4 w-4 mr-1" />
                ${(
                  events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                  events.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0)
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
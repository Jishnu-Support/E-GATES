import React, { useState, useMemo } from 'react';
import {
  HiChevronUp,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  initialRowsPerPage = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to show.',
  actions = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row) => {
      return Object.entries(row).some(([_, val]) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lower);
      });
    });
  }, [data, searchTerm]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(String(bVal))
          : String(bVal).localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (column) => {
    if (!column.sortable) return;
    const key = column.accessor;
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      {/* Top Toolbar */}
      {(searchable || actions) && (
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/40">
          {searchable ? (
            <div className="relative flex-1 max-w-sm">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
          ) : (
            <div />
          )}

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto min-h-[220px]">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner message="Loading records..." />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-6 px-4">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(col)}
                    className={`px-4 py-3.5 ${
                      col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-800' : ''
                    } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="flex flex-col text-[10px]">
                          <HiChevronUp
                            className={`w-3 h-3 -mb-1 ${
                              sortConfig.key === col.accessor && sortConfig.direction === 'asc'
                                ? 'text-primary-600 dark:text-cyan-400 font-bold'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                          <HiChevronDown
                            className={`w-3 h-3 ${
                              sortConfig.key === col.accessor && sortConfig.direction === 'desc'
                                ? 'text-primary-600 dark:text-cyan-400 font-bold'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-primary-50/40 dark:hover:bg-slate-800/50 transition-colors duration-150"
                >
                  {columns.map((col, colIndex) => {
                    const cellValue = col.accessor ? row[col.accessor] : undefined;
                    return (
                      <td
                        key={colIndex}
                        className={`px-4 py-3.5 whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(cellValue, row, rowIndex) : (cellValue ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && sortedData.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/40 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)} to{' '}
              {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} records
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Previous page"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-gray-700 dark:text-gray-200">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Next page"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Plus } from 'lucide-react';

export type ArchiveFilter = 'all' | 'series' | 'single' | 'ru' | 'en';

interface TopBarProps {
  activeFilter: ArchiveFilter;
  onFilterChange: (filter: ArchiveFilter) => void;
  onNewDay: () => void;
  onLogoClick: () => void;
}

const NAV_ITEMS: Array<{ id: ArchiveFilter; label: string }> = [
  { id: 'all', label: 'All Days' },
  { id: 'series', label: 'Series' },
  { id: 'single', label: 'One Moment' },
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeFilter,
  onFilterChange,
  onNewDay,
  onLogoClick,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#F2EFE9]/10 bg-[#121110]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single wordmark */}
        <button
          type="button"
          onClick={onLogoClick}
          className="font-editorial text-2xl tracking-[0.06em] text-[#F2EFE9] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97736]"
        >
          EMULSION
        </button>

        {/* Zone 2: Clean single-line navigation / filter links */}
        <nav aria-label="Archive filters" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={`text-sm transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97736] ${
                  isActive
                    ? 'text-[#F2EFE9] border-[#D97736] font-medium'
                    : 'text-[#F2EFE9]/60 border-transparent hover:text-[#F2EFE9] hover:border-[#F2EFE9]/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewDay}
            className="inline-flex items-center gap-2 rounded-sm bg-[#F2EFE9] px-4 py-2 text-xs font-medium tracking-wide text-[#121110] transition-all duration-150 hover:bg-[#E5DFD3] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Day</span>
          </button>
        </div>
      </div>
    </header>
  );
};

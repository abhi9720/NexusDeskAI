import * as React from 'react';
import {
  HiBars3,
  HiInbox,
  HiCalendarDays,
  HiFolder,
  HiFolderPlus,
  HiTag,
  HiCheck,
  HiEllipsisHorizontal,
  HiSquares2X2,
  HiSun,
  HiMoon,
  HiSparkles,
  HiPlus,
  HiClock,
  HiCheckCircle,
  HiXMark,
  HiTrash,
  HiCamera,
  HiVideoCamera,
  HiMicrophone,
  HiPaperClip,
  HiListBullet,
  HiPencil,
  HiViewColumns,
  HiQueueList,
  HiCog6Tooth,
  HiBell,
  HiQuestionMarkCircle,
  HiPencilSquare,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiMagnifyingGlass,
  HiDocumentText,
  HiBookmarkSquare,
  HiLightBulb,
  HiBeaker,
  HiPaintBrush,
  HiArrowUp,
  HiArrowDown,
  HiUserCircle,
  HiArrowsPointingOut,
  HiArrowsPointingIn,
  HiArrowTrendingUp,
  HiTrophy,
  HiCheckBadge,
  HiComputerDesktop,
  HiFunnel,
  HiBarsArrowDown,
  HiTableCells,
  HiChatBubbleLeftEllipsis,
  HiFlag,
  HiKey,
  HiViewfinderCircle,
  HiExclamationTriangle,
  HiFire,
  HiArrowDownTray,
  HiBolt,
} from 'react-icons/hi2';
import { FaGithub, FaLinkedin, FaStickyNote } from 'react-icons/fa';
import { TbAtom2 } from 'react-icons/tb';

const IconWrapper = (IconComponent) => ({ className }) => <IconComponent className={className} />;

export const Bars3Icon = IconWrapper(HiBars3);
export const InboxIcon = IconWrapper(HiInbox);
export const CalendarDaysIcon = IconWrapper(HiCalendarDays);
export const FolderIcon = IconWrapper(HiFolder);
export const FolderPlusIcon = IconWrapper(HiFolderPlus);
export const TagIcon = IconWrapper(HiTag);
export const CheckIcon = IconWrapper(HiCheck);
export const EllipsisHorizontalIcon = IconWrapper(HiEllipsisHorizontal);
export const MatrixIcon = IconWrapper(HiSquares2X2);
export const SunIcon = IconWrapper(HiSun);
export const MoonIcon = IconWrapper(HiMoon);
export const SparklesIcon = IconWrapper(HiSparkles);
export const PlusIcon = IconWrapper(HiPlus);
export const ClockIcon = IconWrapper(HiClock);
export const CheckCircleIcon = IconWrapper(HiCheckCircle);
export const XMarkIcon = IconWrapper(HiXMark);
export const TrashIcon = IconWrapper(HiTrash);
export const CameraIcon = IconWrapper(HiCamera);
export const VideoIcon = IconWrapper(HiVideoCamera);
export const MicrophoneIcon = IconWrapper(HiMicrophone);
export const PaperClipIcon = IconWrapper(HiPaperClip);
export const ListBulletIcon = IconWrapper(HiListBullet);
export const PencilIcon = IconWrapper(HiPencil);
export const ViewColumnsIcon = IconWrapper(HiViewColumns);
export const QueueListIcon = IconWrapper(HiQueueList);
export const CogIcon = IconWrapper(HiCog6Tooth);
export const BellIcon = IconWrapper(HiBell);
export const QuestionMarkCircleIcon = IconWrapper(HiQuestionMarkCircle);
export const DashboardIcon = IconWrapper(HiSquares2X2);
export const TasksIcon = IconWrapper(HiQueueList);
export const NotesIcon = IconWrapper(HiPencilSquare);
export const ChevronLeftIcon = IconWrapper(HiChevronLeft);
export const ChevronRightIcon = IconWrapper(HiChevronRight);
export const ChevronDoubleLeftIcon = IconWrapper(HiChevronDoubleLeft);
export const ChevronDoubleRightIcon = IconWrapper(HiChevronDoubleRight);
export const MagnifyingGlassIcon = IconWrapper(HiMagnifyingGlass);
export const StickyNoteIcon = IconWrapper(FaStickyNote);
export const DocumentTextIcon = IconWrapper(HiDocumentText);
export const PinIcon = IconWrapper(HiBookmarkSquare);
export const LightBulbIcon = IconWrapper(HiLightBulb);
export const FlaskIcon = IconWrapper(HiBeaker);
export const PaletteIcon = IconWrapper(HiPaintBrush);
export const ArrowUpIcon = IconWrapper(HiArrowUp);
export const ArrowDownIcon = IconWrapper(HiArrowDown);
export const UserCircleIcon = IconWrapper(HiUserCircle);
export const FullScreenIcon = IconWrapper(HiArrowsPointingOut);
export const ExitFullScreenIcon = IconWrapper(HiArrowsPointingIn);
export const TrendingUpIcon = IconWrapper(HiArrowTrendingUp);
export const TrophyIcon = IconWrapper(HiTrophy);
export const CheckBadgeIcon = IconWrapper(HiCheckBadge);
export const ComputerDesktopIcon = IconWrapper(HiComputerDesktop);
export const FilterIcon = IconWrapper(HiFunnel);
export const GroupByIcon = IconWrapper(HiSquares2X2);
export const SortIcon = IconWrapper(HiBarsArrowDown);
export const TableCellsIcon = IconWrapper(HiTableCells);
export const ChatBubbleLeftEllipsisIcon = IconWrapper(HiChatBubbleLeftEllipsis);
export const FlagIcon = IconWrapper(HiFlag);
export const HistoryIcon = IconWrapper(HiClock);
export const KeyIcon = IconWrapper(HiKey);
export const GithubIcon = IconWrapper(FaGithub);
export const LinkedinIcon = IconWrapper(FaLinkedin);
export const CrosshairIcon = IconWrapper(HiViewfinderCircle);
export const ExclamationTriangleIcon = IconWrapper(HiExclamationTriangle);
export const FireIcon = IconWrapper(HiFire);
export const ExportIcon = IconWrapper(HiArrowDownTray);
export const BoltIcon = IconWrapper(HiBolt);

export const AtomIcon = ({ className }: { className?: string }) => (
    <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-gray-900 rounded-full"></div>
        <TbAtom2 className="relative w-full h-full p-2 text-sky-400" />
    </div>
);
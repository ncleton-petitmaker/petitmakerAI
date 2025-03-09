import { FileText, Video, BookOpen } from 'lucide-react';

export const getResourceIcon = (type: string) => {
  switch (type) {
    case 'document':
      return FileText;
    case 'video':
      return Video;
    case 'exercise':
      return BookOpen;
    default:
      return FileText;
  }
};
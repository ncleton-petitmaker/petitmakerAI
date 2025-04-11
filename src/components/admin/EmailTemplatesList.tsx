import React, { useState, useEffect } from 'react';
import { listEmailTemplates, deleteEmailTemplate } from '../../services/api/emailTemplateService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Pencil, 
  Trash2, 
  Search, 
  Plus,
  Check,
  X,
  Clock,
  MailPlus
} from 'lucide-react';
import { Input } from '../ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { ViewType } from './AdminSidebar';

interface EmailTemplatesListProps {
  setCurrentView: (view: ViewType) => void;
  setSelectedTemplate: (template: any) => void;
  onEditTemplate?: (template: any) => void;
}

const EmailTemplatesList: React.FC<EmailTemplatesListProps> = ({ 
  setCurrentView, 
  setSelectedTemplate,
  onEditTemplate
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await listEmailTemplates();
      if (response.success) {
        setTemplates(response.data);
      } else {
        setError("Erreur lors de la récupération des modèles d'email");
      }
    } catch (err) {
      setError("Erreur lors de la récupération des modèles d'email");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: any) => {
    console.log('EmailTemplatesList - handleEditTemplate called with template:', template);
    console.log('EmailTemplatesList - onEditTemplate exists:', !!onEditTemplate);
    
    if (onEditTemplate) {
      console.log('EmailTemplatesList - Using onEditTemplate function');
      onEditTemplate(template);
    } else {
      console.log('EmailTemplatesList - Using fallback navigation');
      setSelectedTemplate(template);
      setCurrentView('email-create');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      const response = await deleteEmailTemplate(templateToDelete.id);
      if (response.success) {
        setTemplates(templates.filter(t => t.id !== templateToDelete.id));
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
      } else {
        setError("Erreur lors de la suppression du modèle");
      }
    } catch (err) {
      setError("Erreur lors de la suppression du modèle");
      console.error(err);
    }
  };

  const confirmDelete = (template: any) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScheduleTypeText = (type: string | null, days: number | null) => {
    if (!type || days === null) return 'Non planifié';
    
    if (type === 'before_training_start') {
      return `${days} jour${days > 1 ? 's' : ''} avant le début`;
    } else if (type === 'after_training_end') {
      return `${days} jour${days > 1 ? 's' : ''} après la fin`;
    }
    
    return 'Planification inconnue';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Modèles d'emails</h1>
        <Button 
          onClick={() => {
            setSelectedTemplate(null);
            setCurrentView('email-create');
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} />
          Créer un modèle
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Rechercher un modèle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <MailPlus className="h-16 w-16 text-gray-300" />
          <p className="text-gray-500 text-lg">Aucun modèle d'email trouvé</p>
          <Button 
            onClick={() => {
              setSelectedTemplate(null);
              setCurrentView('email-create');
            }}
            variant="outline"
          >
            Créer votre premier modèle
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Planification</TableHead>
              <TableHead className="w-24">Statut</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  {template.name}
                  {template.file_id && (
                    <div className="text-xs text-gray-500 mt-1">
                      Avec pièce jointe: {template.files?.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>{template.subject}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {getScheduleTypeText(template.schedule_type, template.schedule_days)}
                  </div>
                </TableCell>
                <TableCell>
                  {template.status ? (
                    <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                      <Check size={12} /> Actif
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                      <X size={12} /> Inactif
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        console.log("Edit button clicked for template:", template.id);
                        setSelectedTemplate(template);
                        setTimeout(() => {
                          setCurrentView('email-create');
                        }, 10);
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hover:bg-gray-50">
                          <span className="sr-only">Ouvrir le menu</span>
                          <span className="h-4 w-4">⋮</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            console.log("Clic sur le bouton Modifier pour le template:", template);
                            setSelectedTemplate(template);
                            setTimeout(() => {
                              setCurrentView('email-create');
                            }, 10);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => confirmDelete(template)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le modèle "{templateToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailTemplatesList; 
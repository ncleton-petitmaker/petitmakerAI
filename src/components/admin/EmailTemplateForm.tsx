import React, { useState, useEffect } from 'react';
import { 
  createEmailTemplate, 
  updateEmailTemplate,
  sendTestEmail as sendEmailTemplateTest
} from '../../services/api/emailTemplateService';
import { getAvailableTemplateVariables } from '../../services/api/emailSenderService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Textarea } from '../ui/textarea';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Variable, 
  Send,
  Pen,
  Trash2,
  Clock
} from 'lucide-react';
import { ViewType } from './AdminSidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';

// Types
interface EmailTemplateFormProps {
  setCurrentView: (view: ViewType) => void;
  selectedTemplate: any;
}

interface TemplateVariable {
  key: string;
  description: string;
}

const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({ 
  setCurrentView, 
  selectedTemplate 
}) => {
  const isEditMode = !!selectedTemplate;
  
  // Form state
  const [name, setName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [status, setStatus] = useState<boolean>(true);
  const [scheduleType, setScheduleType] = useState<string | null>(null);
  const [scheduleDays, setScheduleDays] = useState<number | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [currentFile, setCurrentFile] = useState<any>(null);
  
  // Variables and UI state
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  
  // Initialize form with template data if in edit mode
  useEffect(() => {
    console.log('EmailTemplateForm - useEffect triggered');
    console.log('EmailTemplateForm - selectedTemplate:', JSON.stringify(selectedTemplate));
    
    if (selectedTemplate && Object.keys(selectedTemplate).length > 0) {
      console.log('EmailTemplateForm - Setting form with template data');
      // Force un petit délai pour s'assurer que React a bien mis à jour l'état
      setTimeout(() => {
        setName(selectedTemplate.name || '');
        setSubject(selectedTemplate.subject || '');
        setBody(selectedTemplate.body || '');
        setStatus(selectedTemplate.status !== undefined ? selectedTemplate.status : true);
        setScheduleType(selectedTemplate.schedule_type || null);
        setScheduleDays(selectedTemplate.schedule_days || null);
        setSignature(selectedTemplate.signature || null);
        
        if (selectedTemplate.files) {
          setCurrentFile(selectedTemplate.files);
        }
      }, 50);
    } else {
      console.log('EmailTemplateForm - No template data or creating new template');
      // Réinitialiser le formulaire si pas de template sélectionné
      setName('');
      setSubject('');
      setBody('');
      setStatus(true);
      setScheduleType(null);
      setScheduleDays(null);
      setSignature(null);
      setCurrentFile(null);
    }
    
    // Fetch available variables
    fetchVariables();
  }, [selectedTemplate]);
  
  const fetchVariables = async () => {
    try {
      // In a real implementation, this would be an API call
      const availableVariables = getAvailableTemplateVariables();
      setVariables(availableVariables);
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setCurrentFile(null); // Reset current file when a new one is selected
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    setCurrentFile(null);
  };
  
  const insertVariable = (variable: TemplateVariable) => {
    const textToInsert = `{{${variable.key}}}`;
    setBody(body + textToInsert);
  };
  
  const insertSignature = () => {
    const signatureHtml = `<p>Cordialement,</p><p>L'équipe de formation</p>`;
    setSignature(signatureHtml);
    setBody(body + signatureHtml);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = {
        name,
        subject,
        body,
        status,
        schedule_type: scheduleType,
        schedule_days: scheduleDays,
        signature
      };
      
      let response;
      if (isEditMode) {
        response = await updateEmailTemplate(selectedTemplate.id, formData);
      } else {
        response = await createEmailTemplate(formData);
      }
      
      if (response.success) {
        toast.success(`Modèle ${isEditMode ? 'modifié' : 'créé'} avec succès`);
        setCurrentView('email-templates');
      } else {
        toast.error(`Erreur lors de la ${isEditMode ? 'modification' : 'création'} du modèle`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`Erreur lors de la ${isEditMode ? 'modification' : 'création'} du modèle`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Veuillez saisir une adresse email valide');
      return;
    }
    
    setTestLoading(true);
    
    try {
      // Créer un objet template pour le test
      const templateData = isEditMode 
        ? { id: selectedTemplate.id } 
        : { 
            name, 
            subject, 
            body, 
            signature,
            // Ne pas inclure l'adresse email dans l'objet du template
          };
      
      console.log('Envoi email de test à:', testEmailAddress);
      console.log('Données du template:', templateData);
      
      const response = await sendEmailTemplateTest(
        isEditMode ? selectedTemplate.id : null,
        testEmailAddress,
        isEditMode ? null : templateData
      );
      
      if (response.success) {
        toast.success(`Email de test envoyé à ${testEmailAddress}`);
        setTestEmailDialogOpen(false);
      } else {
        toast.error(`Erreur lors de l'envoi de l'email de test: ${response.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(`Erreur lors de l'envoi de l'email de test`);
    } finally {
      setTestLoading(false);
    }
  };
  
  // ReactQuill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('email-templates')}
          className="mr-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          <span className="ml-2">Retour</span>
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'Modifier le modèle d\'email' : 'Créer un modèle d\'email'}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main form section */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Configurez les informations de base du modèle d'email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du modèle*</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Ex: Confirmation d'inscription" 
                    required 
                    type="text"
                    autoComplete="off"
                    aria-autocomplete="none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Objet de l'email*</Label>
                  <Input 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    placeholder="Ex: Votre inscription à la formation {{training_title}}"
                    required
                    type="text"
                    autoComplete="off"
                    aria-autocomplete="none"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="body">Contenu de l'email*</Label>
                    <div className="space-x-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 bg-gray-50 hover:bg-gray-100 border-gray-300"
                          >
                            <Variable size={14} className="mr-1 text-gray-600" /> 
                            Insérer variable
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Variables disponibles</h4>
                            <p className="text-sm text-gray-500">
                              Cliquez sur une variable pour l'insérer dans le contenu
                            </p>
                            <div className="grid grid-cols-1 gap-1 mt-2 max-h-60 overflow-y-auto">
                              {variables.map((variable) => (
                                <Button
                                  key={variable.key}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start text-left hover:bg-blue-50"
                                  onClick={() => insertVariable(variable)}
                                >
                                  <code className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded text-sm">
                                    {`{{${variable.key}}}`}
                                  </code>
                                  <span className="ml-2 text-gray-600 text-xs">
                                    {variable.description}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-8 bg-gray-50 hover:bg-gray-100 border-gray-300"
                        onClick={insertSignature}
                      >
                        <Pen size={14} className="mr-1 text-gray-600" /> 
                        Insérer signature
                      </Button>
                    </div>
                  </div>
                  
                  <div className="min-h-[300px]">
                    <ReactQuill 
                      theme="snow" 
                      value={body} 
                      onChange={setBody} 
                      modules={modules}
                      className="h-[250px]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Pièce jointe (PDF, DOC, DOCX, max 5MB)</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="file" 
                      type="file" 
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className={currentFile || file ? 'hidden' : ''}
                    />
                    
                    {(currentFile || file) && (
                      <div className="flex items-center justify-between w-full p-2 border rounded">
                        <div className="truncate">
                          {file ? file.name : currentFile?.name}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={handleRemoveFile}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setCurrentView('email-templates')}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Annuler
              </Button>
              
              <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="secondary"
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Send size={16} className="mr-2" />
                    Tester
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Envoyer un email de test</DialogTitle>
                    <DialogDescription>
                      Envoyez un email de test pour vérifier le rendu du modèle.
                      Des données d'exemple d'un apprenant et d'une formation seront automatiquement utilisées pour remplacer les variables.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="testEmail">Adresse email de test</Label>
                      <Input 
                        id="testEmail" 
                        type="email" 
                        placeholder="votre@email.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        L'email sera envoyé à cette adresse avec les données d'exemple d'un apprenant aléatoire.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setTestEmailDialogOpen(false)}
                      className="border-gray-300 hover:bg-gray-100 text-gray-700"
                    >
                      Annuler
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={testLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {testLoading ? 'Envoi en cours...' : 'Envoyer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save size={16} className="mr-2" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
          
          {/* Settings sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres</CardTitle>
                <CardDescription>
                  Configurez les options du modèle d'email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="status" className="block mb-1">Statut</Label>
                    <p className="text-sm text-gray-500">
                      Activez ou désactivez ce modèle
                    </p>
                  </div>
                  <Switch 
                    id="status" 
                    checked={status} 
                    onCheckedChange={setStatus}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduleType">Planification</Label>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Configurez l'envoi automatique
                    </span>
                  </div>
                  <Select
                    value={scheduleType || ''}
                    onValueChange={(value) => {
                      if (value === '') {
                        setScheduleType(null);
                        setScheduleDays(null);
                      } else {
                        setScheduleType(value);
                        if (!scheduleDays) setScheduleDays(1);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune planification</SelectItem>
                      <SelectItem value="before_training_start">Avant le début de la formation</SelectItem>
                      <SelectItem value="after_training_end">Après la fin de la formation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {scheduleType && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduleDays">Nombre de jours</Label>
                    <Input 
                      id="scheduleDays" 
                      type="number" 
                      min="1" 
                      max="90"
                      value={scheduleDays || 1} 
                      onChange={(e) => setScheduleDays(Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">
                      {scheduleType === 'before_training_start' 
                        ? 'Jours avant le début de la formation'
                        : 'Jours après la fin de la formation'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmailTemplateForm; 
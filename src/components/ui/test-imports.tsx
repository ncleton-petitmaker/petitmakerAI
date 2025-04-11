import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from './alert-dialog';
import { Badge } from './badge';
import { Button } from './button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './dropdown-menu';
import { Input } from './input';
import { Label } from './label';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './select';
import { Switch } from './switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './table';
import { Textarea } from './textarea';

// Ce composant de test ne fait rien, il vérifie juste que les imports fonctionnent
export function TestUIComponents() {
  return (
    <div className="p-10 bg-white">
      <h1 className="text-2xl font-bold mb-5">Test des composants UI</h1>
      
      <div className="space-y-10">
        <div>
          <h2 className="text-xl font-semibold mb-3">Alerte</h2>
          <Alert>
            <AlertTitle>Titre de l'alerte</AlertTitle>
            <AlertDescription>Description de l'alerte</AlertDescription>
          </Alert>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Badge</h2>
          <div className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Bouton</h2>
          <div className="flex gap-2">
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Carte</h2>
          <Card>
            <CardHeader>
              <CardTitle>Titre de la carte</CardTitle>
              <CardDescription>Description de la carte</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Contenu de la carte</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Formulaire</h2>
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="exemple@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Votre message ici..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="notifications" />
              <Label htmlFor="notifications">Activer les notifications</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue>Sélectionner une catégorie</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Tableau</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Jean Dupont</TableCell>
                <TableCell>jean@exemple.com</TableCell>
                <TableCell>
                  <Badge variant="success">Actif</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Marie Martin</TableCell>
                <TableCell>marie@exemple.com</TableCell>
                <TableCell>
                  <Badge variant="destructive">Inactif</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 
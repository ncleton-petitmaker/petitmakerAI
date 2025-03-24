/**
 * Page d'administration pour la migration des signatures
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, Button, Typography, List, ListItem, ListItemText, Divider, Alert, CircularProgress, Box, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { SignatureDiagnostic } from '../utils/SignatureDiagnostic';
import { SignatureMigration } from '../utils/SignatureMigration';

const SignatureMigrationPage: React.FC = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [migrationReport, setMigrationReport] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Exécuter le diagnostic
  const runDiagnostic = async () => {
    setLoading('diagnostic');
    setError('');
    setSuccess('');
    
    try {
      const results = await SignatureDiagnostic.runFullDiagnostic();
      setDiagnosticResults(results);
      setSuccess('Diagnostic terminé avec succès.');
    } catch (err) {
      setError(`Erreur lors du diagnostic: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading('');
    }
  };

  // Corriger les problèmes identifiés
  const fixProblems = async () => {
    if (!diagnosticResults) {
      setError('Vous devez d\'abord exécuter le diagnostic.');
      return;
    }
    
    setLoading('fix');
    setError('');
    setSuccess('');
    
    try {
      await SignatureDiagnostic.fixDocumentsTable(diagnosticResults.documentsReport);
      await SignatureDiagnostic.fixDocumentSignatures(diagnosticResults.signaturesReport);
      await SignatureDiagnostic.fixTrainerSignatureUserIds();
      
      // Rafraîchir le diagnostic
      const results = await SignatureDiagnostic.runFullDiagnostic();
      setDiagnosticResults(results);
      
      setSuccess('Corrections appliquées avec succès.');
    } catch (err) {
      setError(`Erreur lors de la correction: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading('');
    }
  };

  // Exécuter la migration
  const runMigration = async () => {
    setLoading('migration');
    setError('');
    setSuccess('');
    
    try {
      const result = await SignatureMigration.migrateSignaturesFromDocumentsTable();
      setMigrationReport(result);
      setSuccess('Migration terminée avec succès.');
    } catch (err) {
      setError(`Erreur lors de la migration: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading('');
    }
  };

  // Vérifier les résultats de la migration
  const verifyMigration = async () => {
    setLoading('verify');
    setError('');
    setSuccess('');
    
    try {
      const results = await SignatureMigration.verifyMigrationResults();
      setVerificationResults(results);
      setSuccess('Vérification terminée avec succès.');
    } catch (err) {
      setError(`Erreur lors de la vérification: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading('');
    }
  };

  // Exécuter la migration complète
  const runFullMigration = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir exécuter la migration complète? Cette opération peut prendre du temps.')) {
      return;
    }
    
    setLoading('fullMigration');
    setError('');
    setSuccess('');
    
    try {
      // 1. Diagnostic
      const diagnosticResults = await SignatureDiagnostic.runFullDiagnostic();
      setDiagnosticResults(diagnosticResults);
      
      // 2. Corrections
      await SignatureDiagnostic.fixDocumentsTable(diagnosticResults.documentsReport);
      await SignatureDiagnostic.fixDocumentSignatures(diagnosticResults.signaturesReport);
      await SignatureDiagnostic.fixTrainerSignatureUserIds();
      
      // 3. Migration
      const migrationReport = await SignatureMigration.migrateSignaturesFromDocumentsTable();
      setMigrationReport(migrationReport);
      
      // 4. Vérification
      const verificationResults = await SignatureMigration.verifyMigrationResults();
      setVerificationResults(verificationResults);
      
      setSuccess('Migration complète terminée avec succès.');
    } catch (err) {
      setError(`Erreur lors de la migration complète: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Card>
        <CardHeader title="Migration des Signatures" />
        <CardContent>
          <Typography variant="body1" paragraph>
            Cette page permet de diagnostiquer, corriger et migrer les signatures entre les anciennes et nouvelles structures de données.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Button 
              variant="contained" 
              onClick={runDiagnostic}
              disabled={loading !== ''}
              startIcon={loading === 'diagnostic' ? <CircularProgress size={20} /> : <InfoIcon />}
            >
              {loading === 'diagnostic' ? 'Diagnostic en cours...' : 'Exécuter le diagnostic'}
            </Button>
            
            <Button 
              variant="contained" 
              onClick={fixProblems}
              disabled={loading !== '' || !diagnosticResults}
              startIcon={loading === 'fix' ? <CircularProgress size={20} /> : <WarningIcon />}
              color="warning"
            >
              {loading === 'fix' ? 'Correction en cours...' : 'Corriger les problèmes'}
            </Button>
            
            <Button 
              variant="contained" 
              onClick={runMigration}
              disabled={loading !== ''}
              startIcon={loading === 'migration' ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              color="primary"
            >
              {loading === 'migration' ? 'Migration en cours...' : 'Migrer les signatures'}
            </Button>
            
            <Button 
              variant="contained" 
              onClick={verifyMigration}
              disabled={loading !== ''}
              startIcon={loading === 'verify' ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              color="success"
            >
              {loading === 'verify' ? 'Vérification en cours...' : 'Vérifier la migration'}
            </Button>
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Button 
              variant="contained" 
              onClick={runFullMigration}
              disabled={loading !== ''}
              startIcon={loading === 'fullMigration' ? <CircularProgress size={20} /> : <WarningIcon />}
              color="error"
              fullWidth
              size="large"
            >
              {loading === 'fullMigration' ? 'Migration complète en cours...' : 'Exécuter la migration complète (toutes les étapes)'}
            </Button>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Résultats du diagnostic */}
          {diagnosticResults && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Résultats du diagnostic</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom>
                  Table Documents
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${diagnosticResults.documentsReport.missingUserIds} ID utilisateur manquants`} 
                    color={diagnosticResults.documentsReport.missingUserIds > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${diagnosticResults.documentsReport.missingTrainingIds} ID formation manquants`} 
                    color={diagnosticResults.documentsReport.missingTrainingIds > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${diagnosticResults.documentsReport.inconsistentSignatureTypes} types incohérents`} 
                    color={diagnosticResults.documentsReport.inconsistentSignatureTypes > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Table Document Signatures
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${diagnosticResults.signaturesReport.missingUserIds} ID utilisateur manquants`} 
                    color={diagnosticResults.signaturesReport.missingUserIds > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${diagnosticResults.signaturesReport.missingTrainingIds} ID formation manquants`} 
                    color={diagnosticResults.signaturesReport.missingTrainingIds > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${diagnosticResults.signaturesReport.inconsistentSignatureTypes} types incohérents`} 
                    color={diagnosticResults.signaturesReport.inconsistentSignatureTypes > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Formations sans signature de formateur
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${diagnosticResults.missingTrainerSignatures.length} formations sans signature de formateur`} 
                    color={diagnosticResults.missingTrainerSignatures.length > 0 ? 'warning' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
                
                {diagnosticResults.missingTrainerSignatures.length > 0 && (
                  <List>
                    {diagnosticResults.missingTrainerSignatures.slice(0, 10).map((training: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={training.title} 
                          secondary={`Formateur: ${training.trainer_name || 'Non spécifié'}, ID: ${training.training_id}`} 
                        />
                      </ListItem>
                    ))}
                    {diagnosticResults.missingTrainerSignatures.length > 10 && (
                      <ListItem>
                        <ListItemText primary={`... et ${diagnosticResults.missingTrainerSignatures.length - 10} autres formations`} />
                      </ListItem>
                    )}
                  </List>
                )}
              </AccordionDetails>
            </Accordion>
          )}
          
          {/* Résultats de la migration */}
          {migrationReport && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Rapport de migration</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${migrationReport.processedRecords} documents traités`} 
                    color="info" 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${migrationReport.successfulMigrations} migrations réussies`} 
                    color="success" 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${migrationReport.failedMigrations.length} migrations échouées`} 
                    color={migrationReport.failedMigrations.length > 0 ? 'error' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
                
                {migrationReport.failedMigrations.length > 0 && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Détails des échecs
                    </Typography>
                    <List>
                      {Object.entries(migrationReport.errors).slice(0, 10).map(([id, error]: [string, any], index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={`ID: ${id}`} 
                            secondary={error} 
                          />
                        </ListItem>
                      ))}
                      {Object.keys(migrationReport.errors).length > 10 && (
                        <ListItem>
                          <ListItemText primary={`... et ${Object.keys(migrationReport.errors).length - 10} autres erreurs`} />
                        </ListItem>
                      )}
                    </List>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          )}
          
          {/* Résultats de la vérification */}
          {verificationResults && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Résultats de la vérification</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${verificationResults.documentsCount} signatures dans table documents`} 
                    color="info" 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${verificationResults.documentSignaturesCount} signatures dans table document_signatures`} 
                    color="info" 
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`${verificationResults.missingSignatures.length} formations sans signature de formateur`} 
                    color={verificationResults.missingSignatures.length > 0 ? 'warning' : 'success'} 
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
                
                {verificationResults.missingSignatures.length > 0 && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Formations sans signature de formateur
                    </Typography>
                    <List>
                      {verificationResults.missingSignatures.slice(0, 10).map((training: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={training.title} 
                            secondary={`Formateur: ${training.trainer_name || 'Non spécifié'}, ID: ${training.training_id}`} 
                          />
                        </ListItem>
                      ))}
                      {verificationResults.missingSignatures.length > 10 && (
                        <ListItem>
                          <ListItemText primary={`... et ${verificationResults.missingSignatures.length - 10} autres formations`} />
                        </ListItem>
                      )}
                    </List>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignatureMigrationPage; 
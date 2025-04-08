# Guide d'application des modifications

Ce dossier contient toutes les modifications nécessaires pour prendre en charge les signatures des représentants légaux dans les conventions de formation.

## Ordre d'application des modifications

Suivez ces étapes dans l'ordre pour appliquer les modifications au fichier `src/components/StudentTrainingAgreement.tsx`:

1. Ajoutez les imports nécessaires (fichier `01_imports.txt`):
   - Ajoutez cette ligne après les imports existants (lignes 20-21)

2. Mettez à jour l'interface SignatureCacheItem (fichier `02_SignatureCacheItem.txt`):
   - Localisez l'interface SignatureCacheItem (vers la ligne 102)
   - Remplacez-la par la version mise à jour qui inclut la propriété `representativeSig`

3. Ajoutez l'état hasRepresentativeSignature (fichier `03_hasRepresentativeSignature.txt`):
   - Ajoutez cet état avec les autres déclarations d'états useState (près de hasParticipantSignature)

4. Ajoutez la fonction safeSetRepresentativeSignature (fichier `04_safeSetRepresentativeSignature.txt`):
   - Ajoutez cette fonction avec les autres fonctions safeSet (près de safeSetParticipantSignature)

5. Mettez à jour la fonction updateSignatureCache (fichier `05_updateSignatureCache.txt`):
   - Localisez la fonction updateSignatureCache existante 
   - Remplacez-la par la version mise à jour qui inclut le paramètre `representativeSig`

6. Mettez à jour la fonction handleSignatureSave (fichier `06_handleSignatureSave.txt`):
   - Localisez la fonction handleSignatureSave existante
   - Remplacez-la par la version mise à jour qui gère le type 'representative'

7. Mettez à jour la fonction loadSignaturesFromSupabase (fichier `07_loadSignaturesFromSupabase.txt`):
   - Localisez la fonction loadSignaturesFromSupabase existante
   - Remplacez-la par la version mise à jour qui charge les signatures de représentant

## Modifications apportées

- Ajout de la propriété `representativeSig` à l'interface SignatureCacheItem
- Création de la fonction `safeSetRepresentativeSignature` pour gérer la signature du représentant
- Mise à jour de la fonction `updateSignatureCache` pour inclure le paramètre `representativeSig`
- Mise à jour de la fonction `handleSignatureSave` pour prendre en charge le type 'representative'
- Mise à jour de la fonction `loadSignaturesFromSupabase` pour charger les signatures de représentant
- Ajout d'un état `hasRepresentativeSignature` pour suivre l'état de la signature du représentant

## Tests après application

Après avoir appliqué les modifications, vérifiez que:

1. La signature du représentant peut être enregistrée dans la base de données
2. La signature du représentant est correctement chargée et affichée
3. Le cache gère correctement la signature du représentant
4. La convention est considérée comme signée si une signature de participant ou de représentant est présente

## Résolution des problèmes

Si des problèmes surviennent après l'application des modifications:

1. Vérifiez que toutes les modifications ont été appliquées correctement
2. Assurez-vous que les dépendances sont satisfaites
3. Consultez les journaux de la console pour les erreurs éventuelles
4. Vérifiez que la base de données est correctement configurée pour stocker les signatures de type 'representative' 
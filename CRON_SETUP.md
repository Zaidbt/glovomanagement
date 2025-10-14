# 🔄 Configuration du Renouvellement Automatique des Tokens

## 📋 Configuration Cron

### 1. Ajouter la tâche cron

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour exécuter toutes les 30 minutes
*/30 * * * * /Users/zaiiidbt/NATURA\ BELDI\ MANAGEMENT/NEW\ NATURA\ CURSOR/natura-beldi/scripts/refresh-tokens.sh >> /var/log/natura-beldi-tokens.log 2>&1
```

### 2. Variables d'environnement

Ajouter dans `.env.local` :

```env
CRON_SECRET=natura-beldi-cron-2024
```

### 3. Test manuel

```bash
# Tester le script
./scripts/refresh-tokens.sh

# Tester l'API directement
curl -X GET -H "Authorization: Bearer natura-beldi-cron-2024" http://localhost:3000/api/cron/token-refresh
```

## 🎯 Fonctionnalités

### ✅ Renouvellement Automatique

- **Vérification** : Toutes les 30 minutes
- **Seuil** : Renouvelle si expiration dans les 30 prochaines minutes
- **Services** : Glovo, Twilio, Gmail (extensible)

### ✅ Interface Utilisateur

- **Bouton de rafraîchissement** manuel
- **Indicateur de statut** des tokens
- **Notifications** de succès/erreur

### ✅ API Endpoints

- `POST /api/tokens/refresh` - Renouvellement manuel
- `GET /api/cron/token-refresh` - Renouvellement automatique
- `GET /api/tokens/status/[id]` - Statut d'un token

## 🔧 Maintenance

### Logs

```bash
# Voir les logs
tail -f /var/log/natura-beldi-tokens.log

# Vérifier le cron
crontab -l
```

### Debug

```bash
# Tester l'API
curl -X POST http://localhost:3000/api/tokens/refresh

# Vérifier les credentials
curl http://localhost:3000/api/credentials
```

## 🚀 Avantages

1. **Transparent** : L'utilisateur n'a rien à faire
2. **Fiable** : Renouvellement avant expiration
3. **Extensible** : Facile d'ajouter d'autres services
4. **Monitoring** : Logs et statuts visibles
5. **Sécurisé** : Authentification par secret

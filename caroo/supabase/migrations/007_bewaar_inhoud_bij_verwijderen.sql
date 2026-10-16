-- Als een account wordt verwijderd, blijft wat die persoon schreef of deelde
-- gewoon in de groep staan (zonder naam). De kolommen waren NOT NULL met
-- ON DELETE SET NULL, waardoor het verwijderen van een account vastliep.
ALTER TABLE taken                  ALTER COLUMN aangemaakt_door    DROP NOT NULL;
ALTER TABLE afspraken              ALTER COLUMN aangemaakt_door    DROP NOT NULL;
ALTER TABLE medicijnen             ALTER COLUMN aangemaakt_door    DROP NOT NULL;
ALTER TABLE medicijn_registraties  ALTER COLUMN geregistreerd_door DROP NOT NULL;
ALTER TABLE dagboek                ALTER COLUMN auteur_id          DROP NOT NULL;
ALTER TABLE tips                   ALTER COLUMN auteur_id          DROP NOT NULL;
ALTER TABLE fotos                  ALTER COLUMN uploader_id        DROP NOT NULL;
ALTER TABLE uitnodigingen          ALTER COLUMN uitgenodigd_door   DROP NOT NULL;

UPDATE project SET featured=CASE WHEN slug IN (
 'designated-establishment-online-submission-deos',
 'pdea-virtual-museum',
 'office-for-alternative-dispute-resolution-oadr'
) THEN 1 ELSE 0 END WHERE deleted=0;
UPDATE project SET category='Web Application',company='WWC Yellow Bumblebee Corp.'
WHERE deleted=0 AND slug IN (
 'designated-establishment-online-submission-deos',
 'pdea-virtual-museum',
 'office-for-alternative-dispute-resolution-oadr'
);

unit UserScript;

var
  gPluginOrder: TStringList;
  gPluginBuckets: TStringList;
  gTotalWeap: Integer;
  gOutputPath: string;

function SafeValue(e: IInterface; const path: string): string;
begin
  try
    Result := Trim(GetElementEditValues(e, path));
  except
    Result := '';
  end;
end;

function NormalizeFormID(const formIdText: string): string;
begin
  if Length(formIdText) >= 8 then
    Result := Copy(formIdText, Length(formIdText) - 7, 8)
  else
    Result := formIdText;
end;

function ExtractAmmoFormID(weap: IInterface): string;
var
  ammoPath: IInterface;
  ammoRec: IInterface;
begin
  Result := '';
  ammoPath := ElementByPath(weap, 'DNAM - Data\Ammo');
  if not Assigned(ammoPath) then
    Exit;

  ammoRec := LinksTo(ammoPath);
  if not Assigned(ammoRec) then
    Exit;

  Result := NormalizeFormID(IntToHex(FixedFormID(ammoRec), 8));
end;

function IsTrackedWeaponTypeFormID(const formId: string): Boolean;
begin
  Result :=
    (formId = '00092A86') or // WeaponTypeBallistic
    (formId = '0004C922') or // WeaponTypeExplosive
    (formId = '00092A85') or // WeaponTypePlasma
    (formId = '00092A84') or // WeaponTypeLaser
    (formId = '0022575F') or // WeaponTypeCryolater
    (formId = '00225762') or // WeaponTypeGammaGun
    (formId = '00225766') or // WeaponTypeBroadsider
    (formId = '0005240E') or // WeaponTypeUnarmed
    (formId = '00226453') or // WeaponTypeHandToHand
    (formId = '0004A0A5') or // WeaponTypeMelee2H
    (formId = '0004A0A4') or // WeaponTypeMelee1H
    (formId = '00225767') or // WeaponTypeRipper
    (formId = '00225768') or // WeaponTypeShishkebab
    (formId = '0010C414') or // WeaponTypeMine
    (formId = '00219686') or // WeaponTypeCryoMine
    (formId = '00219687') or // WeaponTypePulseMine
    (formId = '0021968A') or // WeaponTypeBottlecapMine
    (formId = '00219688') or // WeaponTypeNukaMine
    (formId = '00219689') or // WeaponTypePlasmaMine
    (formId = '0021A29F') or // WeaponTypeMolotov
    (formId = '0010C415') or // WeaponTypeGrenade
    (formId = '0021968B') or // WeaponTypeCryoGrenade
    (formId = '0021968C') or // WeaponTypeNukaGrenade
    (formId = '0021968D') or // WeaponTypePlasmaGrenade
    (formId = '0021968E') or // WeaponTypePulseGrenade
    (formId = '0004A0A3') or // WeaponTypeHeavyGun
    (formId = '0022575D') or // WeaponTypeMinigun
    (formId = '0022575E') or // WeaponTypeGatlingLaser
    (formId = '00225760') or // WeaponTypeFlamer
    (formId = '0022575C') or // WeaponTypeFatman
    (formId = '0022575B') or // WeaponTypeMissileLauncher
    (formId = '00226455') or // WeaponTypeAssaultRifle
    (formId = '0004A0A1') or // WeaponTypeRifle
    (formId = '0004A0A0') or // WeaponTypePistol
    (formId = '00226454') or // WeaponTypeShotgun
    (formId = '001E325D') or // WeaponTypeSniper
    (formId = '00226456') or // WeaponTypeGaussRifle
    (formId = '0004A0A2') or // WeaponTypeAutomatic
    (formId = '00225763') or // WeaponTypeJunkJet
    (formId = '00226452') or // WeaponTypeLaserMusket
    (formId = '00225764') or // WeaponTypeRailwayRifle
    (formId = '00225765') or // WeaponTypeSyringer
    (formId = '00225761') or // WeaponTypeFlareGun
    (formId = '0016968B');   // WeaponTypeAlienBlaster
end;

function ExtractWeaponTypeFormIDs(weap: IInterface): string;
var
  kwda: IInterface;
  kw: IInterface;
  kwRec: IInterface;
  i: Integer;
  kwFormId: string;
  typeList: TStringList;
begin
  Result := '';
  kwda := ElementByPath(weap, 'KWDA - Keywords');
  if not Assigned(kwda) then
    Exit;

  typeList := TStringList.Create;
  try
    typeList.CaseSensitive := False;
    typeList.Duplicates := dupIgnore;

    for i := 0 to ElementCount(kwda) - 1 do begin
      kw := ElementByIndex(kwda, i);
      kwRec := LinksTo(kw);
      if not Assigned(kwRec) then
        Continue;

      kwFormId := NormalizeFormID(IntToHex(FixedFormID(kwRec), 8));
      if not IsTrackedWeaponTypeFormID(kwFormId) then
        Continue;

      if typeList.IndexOf(kwFormId) = -1 then
        typeList.Add(kwFormId);
    end;

    Result := StringReplace(typeList.CommaText, '"', '', [rfReplaceAll]);
  finally
    typeList.Free;
  end;
end;

function GetPluginBucket(const pluginName: string): TStringList;
var
  idx: Integer;
  listObj: TObject;
begin
  idx := gPluginOrder.IndexOf(pluginName);
  if idx = -1 then begin
    gPluginOrder.Add(pluginName);
    listObj := TStringList.Create;
    gPluginBuckets.AddObject(pluginName, listObj);
    Result := TStringList(listObj);
    Exit;
  end;

  Result := TStringList(gPluginBuckets.Objects[idx]);
end;

function Initialize: Integer;
var
  dlgSave: TSaveDialog;
begin
  Result := 0;
  gPluginOrder := TStringList.Create;
  gPluginBuckets := TStringList.Create;
  gPluginBuckets.CaseSensitive := False;
  gPluginBuckets.Duplicates := dupIgnore;
  gTotalWeap := 0;

  dlgSave := TSaveDialog.Create(nil);
  try
    dlgSave.Options := dlgSave.Options + [ofOverwritePrompt];
    dlgSave.Filter := 'Text files (*.txt)|*.txt|All files (*.*)|*.*';
    dlgSave.InitialDir := DataPath;
    dlgSave.FileName := 'WEAP_for_KinataSorter.txt';
    dlgSave.DefaultExt := 'txt';
    if not dlgSave.Execute then begin
      Result := 1;
      Exit;
    end;
    gOutputPath := dlgSave.FileName;
  finally
    dlgSave.Free;
  end;
end;

function Process(e: IInterface): Integer;
var
  sig: string;
  pluginName: string;
  formId: string;
  edid: string;
  fullName: string;
  ammoFormId: string;
  weaponTypeIds: string;
  line: string;
  bucket: TStringList;
begin
  Result := 0;
  if not Assigned(e) then
    Exit;

  sig := Signature(e);
  if sig <> 'WEAP' then
    Exit;

  // Ignore overrides in patch plugins: export only parent/original WEAP records.
  if not IsMaster(e) then
    Exit;

  pluginName := GetFileName(GetFile(e));
  formId := NormalizeFormID(IntToHex(FixedFormID(e), 8));
  edid := SafeValue(e, 'EDID');
  fullName := SafeValue(e, 'FULL - Name');
  if fullName = '' then
    fullName := SafeValue(e, 'NAME - Name');
  if fullName = '' then
    fullName := edid;

  ammoFormId := ExtractAmmoFormID(e);
  if ammoFormId = '' then
    ammoFormId := '00000000';
  weaponTypeIds := ExtractWeaponTypeFormIDs(e);

  line := formId + '-' + edid + '-' + fullName + '|AMMO:' + ammoFormId + '|TYPE:' + weaponTypeIds;
  bucket := GetPluginBucket(pluginName);
  bucket.Add(line);
  Inc(gTotalWeap);
end;

function Finalize: Integer;
var
  outLines: TStringList;
  i, j: Integer;
  pluginName: string;
  bucket: TStringList;
begin
  Result := 0;
  outLines := TStringList.Create;
  try
    for i := 0 to gPluginOrder.Count - 1 do begin
      pluginName := gPluginOrder[i];
      outLines.Add(pluginName);
      bucket := TStringList(gPluginBuckets.Objects[i]);
      bucket.Sort;
      for j := 0 to bucket.Count - 1 do
        outLines.Add(bucket[j]);
      outLines.Add('');
    end;

    outLines.SaveToFile(gOutputPath);
    AddMessage('WEAP export done. Records: ' + IntToStr(gTotalWeap));
    AddMessage('Saved successfully.');
  finally
    outLines.Free;
    for i := 0 to gPluginBuckets.Count - 1 do
      gPluginBuckets.Objects[i].Free;
    gPluginBuckets.Free;
    gPluginOrder.Free;
  end;
end;

end.

unit UserScript;

var
  gPluginOrder: TStringList;
  gPluginBuckets: TStringList;
  gOutputPath: string;
  gTotalArmo: Integer;

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

function GetPluginBucket(const pluginName: string): TStringList;
var
  idx: Integer;
  listObj: TObject;
begin
  idx := gPluginOrder.IndexOf(pluginName);
  if idx = -1 then begin
    gPluginOrder.Add(pluginName);
    listObj := TStringList.Create;
    TStringList(listObj).CaseSensitive := False;
    TStringList(listObj).Duplicates := dupIgnore;
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
  gTotalArmo := 0;

  dlgSave := TSaveDialog.Create(nil);
  try
    dlgSave.Options := dlgSave.Options + [ofOverwritePrompt];
    dlgSave.Filter := 'Text files (*.txt)|*.txt|All files (*.*)|*.*';
    dlgSave.InitialDir := DataPath;
    dlgSave.FileName := 'ARMO_for_SAKR.txt';
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
  line: string;
  bucket: TStringList;
begin
  Result := 0;
  if not Assigned(e) then
    Exit;

  sig := Signature(e);
  if sig <> 'ARMO' then
    Exit;

  // Export only parent/original ARMO records, not overrides.
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

  // SAKR batch format: plugin line, then EDID|FORMID|NAME lines.
  line := edid + '|' + formId + '|' + fullName;

  bucket := GetPluginBucket(pluginName);
  bucket.Add(line);
  Inc(gTotalArmo);
end;

function Finalize: Integer;
var
  i: Integer;
  pluginName: string;
  bucket: TStringList;
  outLines: TStringList;
begin
  Result := 0;

  if gPluginOrder.Count = 0 then begin
    AddMessage('No ARMO records exported.');
  end else begin
    outLines := TStringList.Create;
    try
      for i := 0 to gPluginOrder.Count - 1 do begin
        pluginName := gPluginOrder[i];
        bucket := TStringList(gPluginBuckets.Objects[i]);
        bucket.Sort;

        outLines.Add(pluginName);
        outLines.AddStrings(bucket);
        outLines.Add('');
      end;

      outLines.SaveToFile(gOutputPath);
      AddMessage('Saved: ' + gOutputPath);
      for i := 0 to gPluginOrder.Count - 1 do begin
        pluginName := gPluginOrder[i];
        bucket := TStringList(gPluginBuckets.Objects[i]);
        AddMessage('  ' + pluginName + ' records: ' + IntToStr(bucket.Count));
      end;

      AddMessage('ARMO batch export done. Total records: ' + IntToStr(gTotalArmo));
    finally
      outLines.Free;
    end;
  end;

  for i := 0 to gPluginBuckets.Count - 1 do
    gPluginBuckets.Objects[i].Free;
  gPluginBuckets.Free;
  gPluginOrder.Free;
end;

end.

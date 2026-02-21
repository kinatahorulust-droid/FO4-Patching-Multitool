unit UserScript;

var
  gRecords: TStringList;
  gTotalArmo: Integer;
  gSkippedOtherPlugins: Integer;
  gOutputPath: string;
  gPrimaryPlugin: string;

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

function Initialize: Integer;
var
  dlgSave: TSaveDialog;
begin
  Result := 0;
  gRecords := TStringList.Create;
  gRecords.CaseSensitive := False;
  gRecords.Duplicates := dupIgnore;
  gTotalArmo := 0;
  gSkippedOtherPlugins := 0;
  gPrimaryPlugin := '';

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
  if gPrimaryPlugin = '' then
    gPrimaryPlugin := pluginName;

  // SAKR TXT format supports only one plugin header.
  if pluginName <> gPrimaryPlugin then begin
    Inc(gSkippedOtherPlugins);
    Exit;
  end;

  formId := NormalizeFormID(IntToHex(FixedFormID(e), 8));
  edid := SafeValue(e, 'EDID');
  fullName := SafeValue(e, 'FULL - Name');
  if fullName = '' then
    fullName := SafeValue(e, 'NAME - Name');
  if fullName = '' then
    fullName := edid;

  // Required by SAKR parser: EDID|FORMID (third field is optional and ignored by parser).
  line := edid + '|' + formId + '|' + fullName;
  gRecords.Add(line);
  Inc(gTotalArmo);
end;

function Finalize: Integer;
var
  outLines: TStringList;
begin
  Result := 0;
  outLines := TStringList.Create;
  try
    if gPrimaryPlugin = '' then begin
      AddMessage('No ARMO records exported.');
      Exit;
    end;

    gRecords.Sort;

    outLines.Add('plugin:' + gPrimaryPlugin);
    outLines.AddStrings(gRecords);

    outLines.SaveToFile(gOutputPath);
    AddMessage('ARMO export done. Records: ' + IntToStr(gTotalArmo));
    if gSkippedOtherPlugins > 0 then
      AddMessage('Skipped records from other plugins: ' + IntToStr(gSkippedOtherPlugins));
    AddMessage('Saved successfully.');
  finally
    outLines.Free;
    gRecords.Free;
  end;
end;

end.

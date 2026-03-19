function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // --- 1. SET UP TIMES ---
    var startTime = new Date(data.date + 'T' + data.time + ':00');
    var endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); 

    // --- 2. ROOM CLASH PREVENTION ---
    if (data.roomEmail) {
      var roomCal = CalendarApp.getCalendarById(data.roomEmail);
      if (roomCal) {
        var conflicts = roomCal.getEvents(startTime, endTime);
        if (conflicts.length > 0) {
          // This stops the process if the room is busy
          throw new Error('Room ' + data.roomName + ' is already occupied.');
        }
      }
    }

    // --- 3. FOLDER & RENAMING LOGIC ---
    var folderName = "GenieBook_ATS_Resumes";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // Auto-rename to YYYY-MM-DD_Name_Resume.pdf
    var cleanFileName = data.date + "_" + data.name.replace(/\s+/g, '_') + "_Resume.pdf";
    var blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', cleanFileName);
    
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // --- 4. GUEST LIST ---
    var invitees = [];
    if (data.guests) {
      invitees = data.guests.split(',').map(function(email) { return email.trim(); });
    }
    if (data.roomEmail) { invitees.push(data.roomEmail); }

    // --- 5. CREATE EVENT ---
    var calendar = CalendarApp.getDefaultCalendar();
    var event = calendar.createEvent(
      'INTERVIEW: ' + data.name + ' [' + data.role + ']',
      startTime,
      endTime,
      {
        description: 'Candidate Resume: ' + file.getUrl(),
        location: data.roomName || 'GenieBook Office',
        guests: invitees.join(','),
        sendInvites: true 
      }
    );
    
    event.addAttachment(file);
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
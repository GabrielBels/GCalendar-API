const { google } = require('googleapis');
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

require('dotenv').config();

//#region Parametros API
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
//#endregion

// Google calendar API settings
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendar = google.calendar({ version: "v3" });

// Your TIMEOFFSET Offset
const TIMEOFFSET = '-03:00';

// Get date-time string for calender
const dateTimeForCalendar = (sDate) => {
    let year = sDate.getFullYear();

    let month = sDate.getMonth() + 1;
    if (month < 10)
        month = `0${month}`;

    let day = sDate.getDate();
    if (day < 10)
        day = `0${day}`;

    let hour = sDate.getHours();
    if (hour < 10)
        hour = `0${hour}`;

    let minute = sDate.getMinutes();
    if (minute < 10)
        minute = `0${minute}`;

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;

    let event = new Date(Date.parse(newDateTime));

    let startDate = event;
    // Delay in end time is 1
    let endDate = new Date(new Date(startDate).setHours(startDate.getHours() + 1));

    return { 'start': startDate, 'end': endDate }
};

function createEventObj(title, description, startDate) {
    let dateTime = dateTimeForCalendar(startDate);

    // Event for Google Calendar
    return {
        'summary': title,
        'description': description,
        'start': {
            'dateTime': dateTime['start'],
            'timeZone': 'America/Sao_Paulo'
        },
        'end': {
            'dateTime': dateTime['end'],
            'timeZone': 'America/Sao_Paulo'
        }
    };
}


//#region APIs

// Insert new event on the calendar
// {"title": "Novo evento teste da Vitoooooooooora","description": null,"instanceName": "vitoriabarbara",
// "date": {"year": 2022,"month": 12,"day": 27,"hour": 14,"minute": 0}}
app.post('/CreateEvent', async (req, res) => {
    try {
        const request = req.body;

        // Provide the required configuration
        const instanceCredentials = JSON.parse(process.env[request.instanceName]);

        const auth = new google.auth.JWT(
            instanceCredentials.client_email,
            null,
            instanceCredentials.private_key,
            SCOPES
        );

        const startDate = new Date(request.date.year, request.date.month - 1, request.date.day, request.date.hour, request.date.minute);

        const evObject = createEventObj(request.title, request.description, startDate);

        // Insert new event to Google Calendar
        let response = await calendar.events.insert({
            auth,
            calendarId: instanceCredentials.calendar_id,
            resource: evObject
        });

        console.log(response);

        if (response['status'] == 200 && response['statusText'] === 'OK') {
            return res.status(200).json({ success: true, message: "Evento criado com sucesso." });
        } else {
            throw "Erro interno ao criar evento.";
        }
    } catch (ex) {
        return res.status(400).json({ success: false, message: ex });
    }
});

// Get list of events
//{"instanceName": "vitoriabarbara",
// "startDate": {"year": 2022,"month": 12,"day": 27},
// "endDate": {"year": 2022,"month": 12,"day": 27}}
app.post("/Events", async (req, res) => {

    try {
        const request = req.body;

        const instanceCredentials = JSON.parse(process.env[request.instanceName]);

        const auth = new google.auth.JWT(instanceCredentials.client_email, null, instanceCredentials.private_key, SCOPES);

        // let start = '2020-10-03T00:00:00.000Z';
        // let end = '2020-10-04T00:00:00.000Z';

        const dtStart = `${request.startDate.year}-${request.startDate.month}-${request.startDate.day}T${request.startDate.hour ?? "06"}:${request.startDate.minute ?? "00"}:00.000Z`;
        const dtEnd = `${request.endDate.year}-${request.endDate.month}-${request.endDate.day}T${request.endDate.hour ?? "23"}:${request.endDate.minute ?? "59"}:00.000Z`;

        let response = await calendar.events.list({
            auth,
            calendarId: instanceCredentials.calendar_id,
            timeMin: dtStart,
            timeMax: dtEnd,
            timeZone: 'America/Sao_Paulo'
        });

        let items = (response['data']['items'] ?? []).filter(x => x.status == "confirmed");

        if (items && items.length > 0)
            return res.status(200).json({ success: true, items });
        else
            return res.status(404).json({ success: true, items: null });
    } catch (error) {
        return res.status(500).json({ success: false, message: error });
    }
})

// Delete event
// {"instanceName": "vitoriabarbara","eventId": "1cetgj17ef07cv12p7j1ab7m9s"}
app.delete("/Event", async (req, res) => {

    try {
        const request = req.body;

        const instanceCredentials = JSON.parse(process.env[request.instanceName]);

        const auth = new google.auth.JWT(instanceCredentials.client_email, null, instanceCredentials.private_key, SCOPES);

        let response = await calendar.events.delete({
            auth,
            calendarId: instanceCredentials.calendar_id,
            eventId: request.eventId
        });
        return res.status(200).json({ success: true, message: response });
    } catch (error) {
        return res.status(500).json({ success: false, message: error });
    }
});

app.listen(7171, () => {
    console.log('\nApp escutando na porta: localhost' + ':' + 7171)
});

//#endregion


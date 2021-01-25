// TODO: clean up this mess
// Only change these const variables for configuration!
const baseurl = 'https://api.github.com/repos/hzi-braunschweig/SORMAS-Project/actions/runs?status=success';
const token = '57c1ed9995de7c04' + 'a63f2976a3caa68cfaff390c'; // GitHub access token
const smoothness = 10; // higher = smoother

let total_amount = 100;
let jobsReceived = 0;
let jobs = [];

function fetchData(drawer)
{
        let url = baseurl + '&per_page=1'

        const xmlhttp = new XMLHttpRequest()
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const response = JSON.parse(this.responseText)
                total_amount = response.total_count;
                fetchPages(response.total_count, drawer);
            } else if (this.readyState == 4) {
                console.log("problem encountered - " + this.status)
            }
        }
        xmlhttp.open('GET', url, true)
        xmlhttp.setRequestHeader("Authorization", 'token ' + token);
        xmlhttp.send()
}

function fetchPages(numberOfEntries, drawer)
{

    let entries_left = numberOfEntries;
    let per_page = 100;
    const page_number = Math.ceil(numberOfEntries / per_page);
    let pages_received = 0;

    let runs = [];
    let i = 0;
    while(i < page_number) {
        if(entries_left < per_page)
        {
            per_page = entries_left;
        }
        let url = baseurl + '&per_page=' + per_page + '&page=' + i;
        i++;
        entries_left -= per_page;

        const xmlhttp = new XMLHttpRequest()
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const response = JSON.parse(this.responseText)
                Array.prototype.push.apply(runs, response.workflow_runs);
                pages_received += 1;

                if(pages_received == page_number)
                {
                    console.log("received all " + numberOfEntries + " runs.")
                    let j;
                    for(j = 0; j < (numberOfEntries); j++)
                    {
                        getJob(runs[j].id, drawer)
                    }
                }
            } else if (this.readyState == 4) {
                console.log("problem encountered - " + this.status)
            }
        }
        xmlhttp.open('GET', url, true)
        xmlhttp.setRequestHeader("Authorization", 'token ' + token);
        xmlhttp.send()
    }
}

function getJob(jobId, drawer)
{
    let url = 'https://api.github.com/repos/hzi-braunschweig/SORMAS-Project/actions/runs/' + jobId + '/jobs';
    const xmlhttp = new XMLHttpRequest()



    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            const response = JSON.parse(this.responseText)
            jobsReceived ++;
            jobs.push.apply(jobs, response.jobs);
            if(jobsReceived >= total_amount)
            {
                console.log("start evaluation");
                jobs.sort(function(a,b) {if(Date.parse(a.started_at) < Date.parse(b.completed_at)) {return -1} else {return 1}} )
                evaluateData(jobs, drawer)
            }

        } else if (this.readyState == 4) {
            console.log("problem encountered - " + this.status)
        }
    }
    xmlhttp.open('GET', url, true)
    xmlhttp.setRequestHeader("Authorization", 'token ' + token);
    xmlhttp.send()
}

function evaluateData(runs, drawer)
{
    let runtimes = []
    let totalruntime = 0;
    let i;
    for(i = 0; i < runs.length; i++)
    {
        const createdDate = Date.parse(runs[i].started_at)
        const doneDate = Date.parse(runs[i].completed_at)
        let diff = (doneDate - createdDate)
        diff = diff / 1000
        diff = diff / 60
        runtimes[i] = diff
        totalruntime += diff
    }
    const avg = totalruntime / runs.length;
    console.log('avg: ' + avg)

    // average it over its runs
    let smoothruntimes = [];
    for(i = 0; i < runtimes.length/smoothness; i++)
    {
        let j;
        let total = 0;
        for(j = 0; j < smoothness; j++)
        {
            total += runtimes[i*smoothness+j]
        }
        total/=smoothness;
        smoothruntimes[i] = total;
    }
    console.log('draw graph')
    drawer(smoothruntimes)
    graph(smoothruntimes)
}


function graph(arr) {
    const canvas = document.getElementById("myCanvas");
    const cont = canvas.getContext("2d");
    const width = 900;
    const height = 450;
    const Ymax = 30;
    const xoffset = (1 / (arr.length - 1)) * width;
    const yoffset = (height * (1/Ymax));

    const numDataPoints = arr.length;

    cont.strokeStyle = 'black'

    // draw Rect
    cont.clearRect(0, 0, width, height)
    cont.strokeRect(0, 0, width, height)

    // draw Bars
    for (let i = 0; i < numDataPoints; i+=5) {
        const x = i*xoffset;
        const y = 5;
        cont.beginPath();
        cont.moveTo(x, height);
        cont.lineTo(x, height - y);
        cont.textAlign = 'center'
        if(i!=0)cont.strokeText((i*smoothness).toString(), x, height-y);
        cont.closePath();
        cont.stroke();
    }
    for (let i = 0; i < Ymax; i+=5) {
        const x = 0;
        const y = i*yoffset;
        cont.beginPath();
        cont.moveTo(x, y);
        cont.lineTo(x+5, y);
        cont.textAlign = 'start'
        if(i!=0)cont.strokeText((Ymax-i).toString() + 'm', x+5, y);
        cont.closePath();
        cont.stroke();
    }

    // Draw Graph
    cont.beginPath();
    cont.moveTo(0, height-(arr[0]*yoffset));
    for (let i = 0; i < numDataPoints; i++) {

        const x = i*xoffset;
        const y = height - (arr[i]*yoffset);
        cont.lineTo(x, y);
    }
    cont.closePath();
    cont.stroke();

    // draw Trend
    cont.strokeStyle = 'green'
    cont.beginPath();
    cont.moveTo(0, height-(arr[0]*yoffset));
    cont.lineTo((numDataPoints - 1)*xoffset, height - (arr[numDataPoints-1]*yoffset))
    cont.closePath();
    cont.stroke();
}
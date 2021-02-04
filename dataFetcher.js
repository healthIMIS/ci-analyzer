// TODO: clean up this mess
// Only change these const variables for configuration!
let baseurl = 'https://api.github.com/repos/hzi-braunschweig/SORMAS-Project/actions/runs?status=success';
const token = '57c1ed9995de7c04' + 'a63f2976a3caa68cfaff390c'; // GitHub access token
let smoothness = 10; // higher = smoother
let branches = []; // allowed head branches of jobs. use "*" to evaluate all jobs

let job_amount = 0;
let jobsReceived = 0;
let datapoints = [];

class Datapoint
{
    constructor(jobs)
    {
        // TODO: handle case where multiple jobs are passed
        this.jobs = jobs;
        const createdDate = Date.parse(jobs[0].started_at)
        const doneDate = Date.parse(jobs[0].completed_at)
        let diff = (doneDate - createdDate)
        diff = diff / 1000
        diff = diff / 60
        this.timing = Math.floor(diff*100)/100;
        this.date = Date.parse(jobs[0].started_at)
    }
}

function fetchData(drawer)
{
        let baseurl = 'https://api.github.com/repos/' + document.getElementById("targetrepo").value + '/actions/runs?status=success'
        let url = baseurl + '&per_page=1'
        branches[0] = document.getElementById("branchselector").value;
        smoothness = document.getElementById("smoothnessSelector").value;

        console.log("Starting fetch")

        const xmlhttp = new XMLHttpRequest()
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const response = JSON.parse(this.responseText)
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
    let i = 1;
    while(i <= page_number) {
        let url = baseurl + '&per_page=' + per_page + '&page=' + i;
        i++;

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
                    // reset counters
                    job_amount = 0;
                    jobsReceived = 0;
                    datapoints = [];
                    pages_received = 0;
                    for(j = 0; j < (numberOfEntries); j++)
                    {
                        if(branches.some(branch => (runs[j].head_branch == branch || branch == '*')))
                        {
                            job_amount = job_amount + 1;
                        }
                    }
                    console.log("found " + job_amount + " jobs with corresponding head branch")
                    for(j = 0; j < (numberOfEntries); j++)
                    {
                        if(branches.some(branch => (runs[j].head_branch == branch || branch == '*')))
                        {
                            getJob(runs[j].id, drawer)
                        }
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
            jobsReceived = jobsReceived + 1;
            datapoints.push(new Datapoint(response.jobs))

            const progress = jobsReceived/job_amount*100;
            document.getElementById("progressbarspan").style.width = (progress + "%");

            if(jobsReceived >= job_amount)
            {
                console.log("start evaluation of " + jobsReceived + " jobs");
                datapoints.sort(function(a,b) {if((a.date) < (b.date)) {return -1} else {return 1}} )

                evaluateData(datapoints, drawer)
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
        runtimes[i] = runs[i].timing;
        totalruntime += runs[i].timing;
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
    console.log('draw graph with ' + smoothruntimes.length + ' points')
    drawer(smoothruntimes)
}
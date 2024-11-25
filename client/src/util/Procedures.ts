import {step} from "../contexts/Procedures";
import {makeDurationString, parseNumber, rayleighStatistics, timeUnitMap, valOrDash} from "./Util";

export const processSteps = (
    steps: step[],
    setSteps: (s: step[] | ((s: step[])=>step[]))=>void,
    report: (x: string)=>void,
    getSamples: (timeA: number, timeB: number, type: 'bearing')=>number[],
    trialStartTime: number,
    endTrial: ()=>void,
)=>{
    let newSteps: Partial<step>[] = steps.map(()=>({}));
    let nextStepTime = Infinity;
    let now = new Date().getTime();
    steps.every((s,i)=>{
        if(s.complete){
            return true;
        }
        const step = new Proxy(s,{set: (t,p,v)=>{
            if((s as any)[p] != v){
                (newSteps[i] as any)[p] = v;
            }
            return true;
        }});
        switch(step.type){
            case 'wait':
                let duration = Math.max(0,parseNumber(step.time)||0) * timeUnitMap[step.units];
                if(step.startTime === undefined){
                    step.startTime = now;
                }
                const endTime = (step.startTime??now)+duration;
                if(now < endTime){
                    nextStepTime = Math.min(nextStepTime,endTime);
                    return false;
                }
                step.complete = true;
                break;
            case 'report':
            case 'label':
                step.time = now;
                console.log(step);
                const reports = step.type=='report'?[step]:(steps.filter(x=>x.type=='report'&&(x.from==step.id||x.to==step.id)) as never);
                reports.forEach(reportStep=>{
                    let targetA: typeof step = (steps.filter(x=>x.id==reportStep.from)[0] as any)??reportStep;
                    let targetB: typeof step = (steps.filter(x=>x.id==reportStep.to)[0] as any)??reportStep;
                    // Place the two targets and the report step in order
                    let relevantSteps = [targetA,targetB,reportStep];
                    relevantSteps = relevantSteps
                        .filter((x,i)=>relevantSteps.indexOf(x)==i)
                        .map(x=>[x,steps.findIndex(y=>y.id==x.id)] as [typeof x, number])
                        .sort((a,b)=>a[1]-b[1])
                        .map(x=>x[0]);
                    console.log(relevantSteps);
                    // Only print a result if the current step is the last step in the set
                    if(step.id != relevantSteps[relevantSteps.length-1].id){
                        return;
                    }
                    let timeA = targetA.time??now;
                    let timeB = targetB.time??now;
                    // If time has elapsed between the start and end steps, report results
                    if(timeA != timeB){
                        let samples = getSamples(timeA,timeB,'bearing');
                        let {meanR, meanAngle} = rayleighStatistics(samples);
                        report(`${reportStep.text.trim().length==0?`Report ${steps.filter(x=>x.type=='report').indexOf(reportStep)+1}`:`${reportStep.text.trim()}`}:\nThe ${reportStep.method=='mean_bearing'?'mean bearing':'Rayleigh R statistic'} from T=${makeDurationString(Math.abs(Math.min(timeA,timeB)-trialStartTime))} to T=${makeDurationString(Math.abs(Math.max(timeA,timeB)-trialStartTime))} (${samples.length} Sample${samples.length==1?'':'s'} over ${makeDurationString(Math.abs(timeB-timeA))}) was ${reportStep.method=='mean_bearing'?valOrDash(meanAngle,'degrees',1):valOrDash(meanR,undefined,3)}.`);
                    }
                });
                step.complete = true;
                break;
            case 'comment':
                step.complete = true;
                break;
            case 'end_trial':
                // Mark all steps as complete
                // TODO: Error if steps are skipped
                newSteps.forEach(x=>{
                    x.complete = true;
                });
                endTrial();
                return false;
        }
        return true;
    });
    if(newSteps.some(x=>Object.keys(x).length>0)){
        setSteps(newSteps.map((x,i)=>({...steps[i], ...x} as step)));
    }
    return nextStepTime;
};

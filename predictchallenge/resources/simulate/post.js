// this needs to be mapped to site-specific location
//var numeric = require('/Users/stonerri/Documents/SatraPrediction/CCGame/web/predictchallenge/node_modules/numeric');

// moved numeric to same path as post.js in the resources directory of the app
//var numeric = require('node_modules/numeric');

var numeric = require('numeric');
var simulateID = '';

var debug = 0;

if(Object.keys(parts).length == 1)
{
    simulateID = parts[0];
}
else
{
    setResult([]);
}

function getUniformRandom(min, max, n_samples){
    /* Generate a random number between min and max inclusive
     */
    var arr = numeric.random([n_samples]);
    arr = numeric.floor(numeric.add(min, numeric.mul(arr, max - min + 1)));
    if (n_samples == 1) return arr[0];
    return arr;
};

function getRandomModel(settings, dieChanged, n_teams){
    if (dieChanged){
        if (settings.probafter == '0'){
            min = 1;
            max = 2;
        } else if (settings.probafter == '1'){
            min = 1;
            max = 6;
        } else if (settings.probafter == '2'){
            min = 2;
            max = 12;
        } else if (settings.probafter == '3'){
            min = 2;
            max = 14;
        } else if (settings.probafter == '4'){
            min = 1;
            max = 20;
        } else if (settings.probafter == '5'){
            min = 1;
            max = 100;
        } else if (settings.probafter == '6'){
            min = 1;
            max = 10;
        } else if (settings.probafter == '7'){
            min = settings.afterNumerator;
            max = settings.afterDenominator;
        }
    } else {
        if (settings.probbefore == '0'){
            min = 1;
            max = 2;
        } else if (settings.probbefore == '1'){
            min = 1;
            max = 6;
        } else if (settings.probbefore == '2'){
            min = 2;
            max = 12;
        } else if (settings.probbefore == '3'){
            min = 2;
            max = 14;
        } else if (settings.probbefore == '4'){
            min = 1;
            max = 20;
        } else if (settings.probbefore == '5'){
            min = 1;
            max = 100;
        } else if (settings.probbefore == '6'){
            min = 1;
            max = 10;
        } else if (settings.probbefore == '7'){
            min = settings.beforeNumerator;
            max = settings.beforeDenominator;
        }        
    }
    return {'sequence': getUniformRandom(min, max, n_teams),
            'max': max}
}

function generateRainfall(settings, die_changed, n_teams){
    /*Randomly generate local and regional rainfall and determine flooding
     */
    var result = getRandomModel(settings, die_changed, n_teams)
    var max_rain = result['max']
    if (die_changed)
        var target_rain_prob = settings.afterThreshold;
    else
        var target_rain_prob = settings.beforeThreshold;
    var regional_rainfall = result['sequence']
    var result = getRandomModel(settings, die_changed, n_teams)
    max_rain += result['max']
    var local_rainfall = result['sequence'];
    var total_rainfall = numeric.add(local_rainfall, regional_rainfall);
    var flooded = numeric.geq(total_rainfall, target_rain_prob * max_rain);
    return {'regional': regional_rainfall,
            'local': local_rainfall,
            'flood': flooded}
};

function adjustBeans(beans, payments, flooded, round_idx, drr_teams, penalty, drr_penalty, drr_round_start){
    /*Adjust the beans according to payments, flooding and penalty
    */
    var cur_drr_penality = drr_penalty;
    if (round_idx < drr_round_start){
        cur_drr_penalty = penalty;
    }
    var payments = numeric.mul(payments, numeric.geq(beans, 1));
    if (debug>2) console.log('ab payments: ' + payments);
    var penalized = numeric.max(numeric.sub(flooded, payments), 0)
    if (debug>2) console.log('ab penalized: ' + penalized);
    var beans_to_remove = numeric.add(numeric.mul(cur_drr_penalty,
                                                  penalized,
                                                  numeric.eq(drr_teams,
                                                             1)),
                                      numeric.mul(penalty,
                                                  penalized,
                                                  numeric.eq(drr_teams,
                                                             0)));
    if (debug>2) console.log('ab beans_to_remove: ' + beans_to_remove);
    var already_in_crisis = numeric.mul(beans, numeric.leq(beans, -1));
    if (debug>2) console.log('ab already_in_crisis: ' + already_in_crisis);
    beans = numeric.mul(beans, numeric.geq(already_in_crisis, 0));
    beans = numeric.sub(beans, numeric.add(payments, beans_to_remove));
    var beans_joining_crisis = numeric.leq(beans, -1);
    beans = numeric.mul(beans, numeric.geq(beans, 0));
    in_crisis = numeric.sub(already_in_crisis, beans_joining_crisis);
    return numeric.add(beans, in_crisis);
};

function randomSelect(x){
    return x[getRandom(0, x.length - 1, 1)];
};

function generateStrategy(max_beans, max_rounds, die_change_round, with_drr){
    /*
    0+ - if [F and DRR/F/DRR/neither] and [round eeq/geq/leq (1,10)] and
         [regional forecast >= int(1, 6 or 8)] then take early action

    */
    strategy = {'forecast_bid': getRandom(0, Math.floor(max_beans/2), 1)};

    strategy['drr_bid'] =
        getRandom(0, Math.floor(max_beans/2 - strategy['forecast_bid']), 1);

    if(with_drr==false)
    {
        strategy['drr_bid'] = 0;
    }

    strategy['rules'] = [];
    if (with_drr){
        bid_conditions = ['F+DRR', 'F', 'DRR', 'none'];
    }else{
        bid_conditions = ['F', 'none'];
    }
    round_condition = ['geq', 'eeq', 'leq'];
    for(var i=0; i < getRandom(0, 10, 1); i++){
        rule = [randomSelect(bid_conditions),
                randomSelect(round_condition),
                getRandom(1, max_rounds, 1)];
        var max_sides = 6;
        if (rule[2] >= die_change_round) max_sides = 8;
        rule.push(getRandom(1, max_sides, 1));
        strategy['rules'].push(rule);
    };
    return strategy;
};

function zeros(shape){
    return numeric.rep(shape, 0);
};

function ones(shape){
    return numeric.rep(shape, 1);
};

function sortWithIndices(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }
  toSort.sort(function(left, right) {
    return left[0] < right[0] ? -1 : 1;
  });
  toSort.sortIndices = [];
  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices.push(toSort[j][1]);
    toSort[j] = toSort[j][0];
  }
  return toSort;
}

function RainGame(n_teams, settings){
        this.settings = settings;
        this.n_teams = n_teams;
        this.n_persons_per_team = 1;
        this.n_beans = settings.numberBeans;
        this.n_rounds = settings.numberRounds;
        this.n_die_change = settings.climateChangeRound;
        this.penalty = 4;
        this.with_drr = settings.drrEnabled;
        this.drr_penalty = 2;
        this.drr_round_start = settings.drrRound;
        this.forecast_bids = zeros([n_teams]); // receive regional forecast
        this.drr_bids = zeros([n_teams]);  // have disaster risk reduction
        this.strategies = {};
        this.teams = [];
};

RainGame.prototype.get_team_index = function(team_id){
        if (this.teams.indexOf(team_id) == -1) this.teams.push(team_id);
        return this.teams.indexOf(team_id);
};

RainGame.prototype.submitStrategy = function(team_id, strategy){
        this.strategies[team_id] = strategy;
        this.submit_forecast_bid(team_id, strategy['forecast_bid']);
        if (this.with_drr)
            this.submit_drr_bid(team_id, strategy['drr_bid']);
        //if (debug) console.log(strategy);
};

RainGame.prototype.submit_forecast_bid = function(team_id, bid){
        team_index = this.get_team_index(team_id);
        //if (debug) console.log(team_index);
        this.forecast_bids[team_index] = bid;
};

RainGame.prototype.submit_drr_bid = function(team_id, bid){
        team_index = this.get_team_index(team_id);
        //if (debug) console.log(team_index);
        this.drr_bids[team_index] = bid;
};

RainGame.prototype.getPayments = function(regional_rainfall, forecast_teams, drr_teams, turn){
    /*
        0+ - if [F and DRR/F/DRR/neither] and [round eeq/geq/leq (1,10)] and
             [regional forecast >= int(1, 6 or 8)] then take early action
    */
    payments = zeros([this.n_teams]);
    //if (debug) console.log(this);
    for(var i=0; i< this.teams.length; i++){
        var team = this.teams[i];
        team_index = this.get_team_index(team);
        var rules = this.strategies[team]['rules'];
        if (debug>2) console.log(team);
        var paid = false;
        for(var j=0; j<rules.length & !paid; j++){
            var rule = rules[j];
            if (debug>2) console.log(rule);
            var regional_forecast_bad = (regional_rainfall[team_index] >= rule[3]);
            if (regional_forecast_bad){
                valid_round = (((rule[1] == 'eeq') & (turn == rule[2])) |
                               ((rule[1] == 'geq') & (turn >= rule[2])) |
                               ((rule[1] == 'leq') & (turn <= rule[2])));
                if (valid_round){
                    var forecast = ((rule[0].indexOf('F') != -1) & forecast_teams[team_index]);
                    var drr = ((rule[0].indexOf('DRR')) & drr_teams[team_index]);
                    var neither = (rule[0].indexOf('none') != -1);
                    if ((forecast & drr) | forecast | drr | neither) paid = true;
                };
            };
        };
        if (paid) payments[team_index] =  1;
    };
    //if (debug) console.log(payments);
    return payments;
};

RainGame.prototype.simulateOnce = function(random_state){
    var beans = numeric.mul(this.n_beans, ones([this.n_teams]));
    var crises = zeros([this.n_teams]);

    if (debug) console.log('Getting winning forecast bids');
    //# perform forecast bids
    var forecast_bids = this.forecast_bids.slice(0);
    sortWithIndices(forecast_bids);
    if (debug) console.log('f bids: ' + this.forecast_bids);
    if (debug) console.log(forecast_bids.sortIndices);
    var half_teams = Math.floor(this.n_teams/2);
    var forecast_teams = zeros([this.n_teams]);
    for(var i=half_teams; i<this.n_teams; i++){
        forecast_teams[forecast_bids.sortIndices[i]] = 1;
    };

    //# Winning teams pay their beans
    beans = numeric.sub(beans, numeric.mul(forecast_teams, this.forecast_bids));

    var drr_teams = zeros([this.n_teams]);
    if (this.with_drr){
        if (debug) console.log('Getting winning drr bids');
        //# perform drr bids
        var drr_bids = this.drr_bids.slice(0);
        sortWithIndices(drr_bids);
        if (debug) console.log('d bids: ' + this.drr_bids);
        if (debug) console.log(drr_bids.sortIndices);
        drr_teams[drr_bids.sortIndices[this.n_teams - 1]] = 1;
        //# Winning teams pay their beans
        beans = numeric.sub(beans, numeric.mul(drr_teams, this.drr_bids));
    };
    if (debug){
        console.log('beans: ' + beans);
        console.log('forecast: ' + forecast_teams);
        console.log('drr: ' + drr_teams);
    }
    numeric.seedrandom.seedrandom(random_state);

    for(var turn=1; turn <= this.n_rounds; turn++){
        if (debug>2) console.log('Turn: ' + turn);
        var die_changed = false;
        if (turn >= this.n_die_change) 
            die_changed = true;
        rain = generateRainfall(this.settings,
                                die_changed,
                                this.n_teams);
        payments = this.getPayments(rain['regional'],
                                    forecast_teams, drr_teams,
                                    turn);
        if (debug>2) console.log('Flood: ' + rain['flood']);
        if (debug>2) console.log('Regional: ' + rain['regional']);
        if (debug>2) console.log('Payments: ' + payments);
        beans = adjustBeans(beans.slice(0), payments, rain['flood'], turn,
                            drr_teams, this.penalty, this.drr_penalty,
                            this.drr_round_start);
        if (debug) console.log('Beans[' + turn + ']: ' + beans);
    }
    if (debug) console.log(beans);
    return beans;
};

RainGame.prototype.simulate = function(n_iters){
    if (this.n_teams < this.teams.length) this.n_teams = this.teams.length;
    var crises = zeros([this.n_teams]);
    var total_beans = zeros([this.n_teams]);
    for(var i=0; i<n_iters; i++){
        if (debug>1) console.log('Simulating iteration: ' + i);
        var beans = this.simulateOnce(0);
        for(var j=0; j<this.n_teams; j++){
            if (beans[j]<0) 
                crises[j] += beans[j];
            else
                total_beans[j] += beans[j];
        }
        if (debug>2) console.log('crises: ' + crises);
    }
    if (debug) console.log('collecting stats');
    result = [];
    for(i=0; i<this.teams.length; i++){
        team = this.teams[i];
        team_index = this.get_team_index(team);
        //if (debug) console.log(i);
        //if (debug) console.log(team);
        //if (debug) console.log(team_index);
        result.push({'team': team,
                     'beans': total_beans[team_index]/n_iters,
                     'crises': crises[team_index]/n_iters,
                     'forecast': this.strategies[team]['forecast_bid'],
                     'drr': this.strategies[team]['drr_bid']
                    });
    };
    return result;
};



dpd.game.get(body.compname, 

    function(competition_data, error) {

        console.log(competition_data);

        var n_teams = competition_data.data.length;
        var rg = new RainGame(n_teams, competition_data.settings);
        // n_beans, n_rounds, die_change_round, with_drr);

        for(i=0;i<n_teams;i++)
        {
            var playerid = competition_data.data[i].name;

            // using strategy ID to enable multiple strategies per user in same competition
            var strategyID = competition_data.data[i].stratid;
            var playerstrategy = competition_data.data[i].strat;

            rg.submitStrategy(strategyID, playerstrategy);
        }

        var simresult = rg.simulate(1000);

//        console.log(simresult);
        
        var createDate = new Date().getTime();
        
        competition_data.runDate = createDate;
        competition_data.state = 'completed';

        for(j=0;j<simresult.length;j++)
        {
            var outcome = simresult[j];
            
            dpd.strategy.get(outcome.team, function(r, e)
            {
                // we now hoave a single strategy
                
                r.competitionID = body.compid;
                r.aggregateBeans.push(outcome.beans);
                r.aggregateCrises.push(outcome.crises);

                dpd.strategy.put(r.id, r);
                
            });
        }
        
//        console.log('weve saved the strategy');

        // update competition data
        for(k=0;k<simresult.length;k++)
        {
            var outcome = simresult[k];

            for(m=0;m<competition_data.data.length;m++)
            {
                if(competition_data.data[m].stratid == outcome.team)
                {
                    // matched
//                    console.log('matched');
                    competition_data.data[m].beans = outcome.beans;
                    competition_data.data[m].crises = outcome.crises;
                    competition_data.data[m].bids = outcome.forecast;
                    competition_data.data[m].ddr = outcome.drr;

                }
            }            
        }

        dpd.game.put(competition_data.id, competition_data);

        emit('SimulationDone', competition_data);

        setResult(competition_data);
});


















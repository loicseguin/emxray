// In this simulation, the X ray beam has a cross-sectional area of 1 m^2 and
// the exposure time is 1 s. Hence, beam intensity and beam energy are
// equivalent (I = E / (St)). All subsequent calculations are done by
// considering that beam energy is used.
//

var electronChargeMantissa = 1.602e-6;

function normalPDF(x, mu, sigma) {
    // Evaluate the probability density function at `x` for a normal
    // distribution with mean `mu` and standard deviation `sigma`.
    // Default: standard normal distribution.
    if (mu === undefined) { mu = 0; }
    if (sigma === undefined) { sigma = 1; }

    var norm = 1 / (Math.sqrt(2 * Math.PI) * sigma);
    return norm * Math.exp(-((x - mu)**2) / (2 * sigma**2));
}

function characteristicSpectrum(photonEnergy) {
    // Characteristic spectrum of tungsten. Spectrum is normalized so that the
    // total number of photons is 1.
    var lineEnergy =
        [0.08, 0.52, 0.6, 2.2, 2.7, 2.8, 9.3, 11.5, 12, 12.1, 57.4,
         66.7, 68.9, 69.4, 69.5];
    var lineWidth =
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
         0.5, 0.5, 0.5];
    var relativeIntensity =
        [0.2, 0.1, 0.2, 0.2, 0.5, 0.5, 1, 1, 1, 1, 1.5, 1, 0.4,
         2, 0.5];

    var dE = photonEnergy[1] - photonEnergy[0];

    // Determine which lines are in the given energy interval.
    var n = photonEnergy.length;
    var eMax = photonEnergy[n - 1];
    var index = lineEnergy.findIndex(function (d) { return d > eMax; });
    if (index < 0) {
        // All lines are included.
        index = lineEnergy.length;
    } else {
        index = index;
    }

    var norm = dE / d3.sum(relativeIntensity.slice(0, index));
    var nbPhotons = new Array(n);
    for (var i = 0; i < n; i++) {
        var energy = photonEnergy[i];
        var linesn = new Array(index);
        for (var j = 0; j < index; j++) {
            var pdf = normalPDF(energy, lineEnergy[j], lineWidth[j] / 4);
            linesn[j] = relativeIntensity[j] * pdf;
        }
        nbPhotons[i] = norm * d3.sum(linesn);
    }
    return nbPhotons;
}

function bremsstrahlungSpectrum(photonEnergy) {
    // Compute Bremsstrahlung spectrum for the given photon energies. The
    // maximum energy is considered to be the last value in `photonEnergy`.
    // Spectrum is normalized so that the total number of photons is 1.
    var n = photonEnergy.length;
    var eMax = photonEnergy[n - 1];
    var dE = photonEnergy[1] - photonEnergy[0];

    // Number of photons.
    var n0 = 2 * dE / eMax;
    var slope = -n0 / eMax;
    var nbPhotons = new Array(n);
    for (var i = 0; i < n; i++) {
        nbPhotons[i] = n0 + slope * photonEnergy[i]; 
    }

    return nbPhotons;
}

function noiseSpectrum(photonEnergy, noiseSD) {
    // Generate gaussian noise with mean 0 and standard deviation `noiseSD`.
    if (noiseSD === undefined) { noiseSD = 1; }
    var n = photonEnergy.length;
    var nbPhotons = new Array(n);
    for (var i = 0; i < n; i++) {
        nbPhotons[i] = d3.randomNormal(0, noiseSD)();
    }
    return nbPhotons;
}

function genSpectrum(photonEnergy, ntot, charStrength, noiseSD) {
    // Compute a spectrum for the given photon energies (in keV). The total
    // number of photons in the spectrum is `ntot` times 1e11. The proportion
    // of characteristic radiation in the total radiation is `charStrength`.
    // For instance, a value of 0.01 for `charStrength` means that the number
    // of photons from characteristic radiation is 1% of the total and the
    // remaining 99% is Bremsstrahlung radiation.
    //
    // The number of photons returned is divided by 1e10.
    if (charStrength === undefined) { charStrength = 0.01; }
    if (noiseSD === undefined) { noiseSD = 0.02; }

    var nbPhotons = bremsstrahlungSpectrum(photonEnergy);
    var charSpec = characteristicSpectrum(photonEnergy);
    var noise = noiseSpectrum(photonEnergy, noiseSD);
    var bremStrength = 1 - charStrength;
    var n = photonEnergy.length;
    for (var i = 0; i < n; i++) {
        nbPhotons[i] = ntot * (bremStrength * nbPhotons[i] + charStrength * charSpec[i]) + noise[i];
        nbPhotons[i] = d3.max([0, nbPhotons[i]]);
    }
    return d3.zip(photonEnergy, nbPhotons);
}


function meanEnergy(spectrum) {
    // Compute the mean energy in keV for the given spectrum.
    var totalEnergy = d3.sum(spectrum, function(d) { return d[0] * d[1]; });
    var totalPhotons = d3.sum(spectrum, function(d) { return d[1]; });
    return totalEnergy / totalPhotons;
}


function totalEnergy(spectrum) {
    // Compute the total energy of the given spectrum in J (can also be
    // interpreted as an intensity in W/m^2).
    var totalEnergy = d3.sum(spectrum, function(d) { return d[0] * d[1]; });
    return totalEnergy * electronChargeMantissa;
}


function totalPhotons(spectrum) {
    // Compute the total number of photons in the spectrum (divided by 1e10).
    return d3.sum(spectrum, function(d) { return d[1]; });
}


function mAsToNphotons(mAs) {
    // Convert a tube charge into a number of photons. We use a very simple
    // model where 1% of tube electrons are converted into X rays and 1% of
    // produced X rays are able to exit the tube.
    //
    // The number of photons returned is divided by 1e10.
    return 1e-4 * mAs / electronChargeMantissa;
}


function nphotonsTomAs(n) {
    // Convert a number of photons into a  tube charge. We use a very simple
    // model where 1% of tube electrons are converted into X rays and 1% of
    // produced X rays are able to exit the tube.
    //
    // The given number of photons is divided by 1e10.
    return 1e4 * n * electronChargeMantissa;
}

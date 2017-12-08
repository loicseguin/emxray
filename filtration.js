function beerLambert(spectrum, thickness, attenuationCoeffs) {
    // Filter the incoming beam according to the Beer-Lambert equation:
    //     n_t = n_i exp(-\mu L).
    // The incoming spectrum is an array where each element corresponds to a
    // specific energy. The attenuation coefficient of the material must be
    // specified for all energies, hence `attenuationCoeff` must be the same
    // length as `spectrum`.
    //
    // Parameters:
    //     `spectrum`: array of incoming number of photons
    //     `thickness`: thickness of material in meters
    //     `attenuationCoeffs`: attenuation coefficients in inverse meters
    //         (m^{-1}). Length must match that of nbPhotons.
    //
    return spectrum.map(function(d, i) {
        return [d[0], d[1] * Math.exp(-attenuationCoeffs[i] * thickness)];
    });
}

function findAttenuation(coeffs, energy) {
    // Given a list of attenuation coefficients for various energies `coeffs`,
    // find the attenuation coefficient for the given energy. Exponential
    // interpolation is used. `coeffs` must be a list of energy (in keV),
    // attenuation coefficient pairs.
    var index = coeffs.findIndex(function(d) { return d[0] > energy; });
    if (index < 0) {
        // Energy is too high. Give something reasonable.
        return 100 * coeffs[coeffs.length - 1][1];
    }
    if (index < 1) {
        // Energy is too low. Give something reasonable.
        return 1000 * coeffs[0][1];
    }
    var energy1 = coeffs[index - 1][0];
    var mu1 = coeffs[index - 1][1];
    var energy2 = coeffs[index][0];
    var mu2 = coeffs[index][1];
    var slope = Math.log(mu2 / mu1) / Math.log(energy2 / energy1);
    return mu1 * (energy / energy1)**slope;
}

function allAttenuationCoeffs(coeffs, energies) {
    // Compute the attenuation coefficients by interpolation for all energies
    // based on the provided attenuation coeffs data.
    return energies.map(function(energy) {
        return findAttenuation(coeffs, energy);
    });
}

function anodeFiltration(spectrum, depth, anodeAngle, beamAngle) {
    // Filter the incoming beam when it leaves the anode. The electron beam
    // penetrates the anode to `depth` (in meters). The anode has an angle at
    // the tip `anodeAngle`. The X ray beam makes an angle `beamAngle` on each
    // side of the vertical. Angles should be in radians.
    //
    // This function returns the spectrum at the center of the beam as well as
    // an array of energies (in J) along the anode-cathode axis.

    if (depth === undefined) { depth = 1e-6; }
    if (anodeAngle === undefined) { anodeAngle = 45 * Math.PI / 180; }
    if (beamAngle === undefined) { beamAngle = 15 * Math.PI / 180; }

    // Linear span of angles accross the X ray beam.
    var nAngle = 80;
    var dAngle = 2 * beamAngle / nAngle;
    var alpha = d3.range(-beamAngle, beamAngle, dAngle);
    // Thickness of anode for X rays through each angle.
    var thickness = alpha.map(function(d) {
        return depth * Math.cos(anodeAngle) / Math.sin(anodeAngle + d);
    });
    var thicknessCenter = thickness[Math.round((thickness.length - 1)/ 2)];
    var muCoeffs = allAttenuationCoeffs(muTungsten,
        spectrum.map(function(d) { return d[0]; }));
    var energies = thickness.map(function(d) {
        var spec = beerLambert(spectrum, d, muCoeffs);
        return totalIntensity(spec);
    });
    var spec = beerLambert(spectrum, thicknessCenter, muCoeffs);
    return [spec, energies];
}

const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const doTimeSlotsOverlap = (slot1, slot2) => {
    const [s1, e1] = slot1.split('-').map(timeToMinutes);
    const [s2, e2] = slot2.split('-').map(timeToMinutes);
    return s1 < e2 && s2 < e1;
};

const mergeRanges = (ranges) => {
    if (!ranges || ranges.length === 0) return [];
    const parsed = ranges
        .map((r) => {
            const [s, e] = r.split('-').map(timeToMinutes);
            return { start: s, end: e };
        })
        .sort((a, b) => a.start - b.start);
    const merged = [parsed[0]];
    for (let i = 1; i < parsed.length; i++) {
        const last = merged.at(-1);
        const curr = parsed[i];
        if (curr.start <= last.end) {
            last.end = Math.max(last.end, curr.end);
        } else {
            merged.push(curr);
        }
    }
    return merged.map((m) => `${minutesToTime(m.start)}-${minutesToTime(m.end)}`);
};

/**
 * @param {string} range   
 * @param {number} duration
 * @returns {string[]}    
 */
const expandRange = (range, duration = 30) => {
    const [startStr, endStr] = range.split('-');
    const startMin = timeToMinutes(startStr);
    const endMin = timeToMinutes(endStr);
    const slots = [];
    for (let t = startMin; t + duration <= endMin; t += duration) {
        slots.push(`${minutesToTime(t)}-${minutesToTime(t + duration)}`);
    }
    return slots;
};

/**
 * @param {string[]} availabilitySlots 
 * @param {string[]} bookedSlots      
 * @param {number}   duration      
 * @returns {{ available: string[], allGenerated: string[], mergedRanges: string[] }}
 */
const generateBookableSlots = (availabilitySlots, bookedSlots, duration = 30) => {

    const merged = mergeRanges(availabilitySlots);
    let allSlots = [];
    for (const range of merged) {
        allSlots = allSlots.concat(expandRange(range, duration));
    }
    const uniqueSlots = [...new Set(allSlots)].sort((a, b) =>
        a.localeCompare(b)
    );
    const booked = bookedSlots || [];
    const available = uniqueSlots.filter(
        (slot) => !booked.some((b) => doTimeSlotsOverlap(slot, b))
    );
    return {
        available,
        allGenerated: uniqueSlots,
        mergedRanges: merged,
    };
};

module.exports = { generateBookableSlots, mergeRanges, expandRange, doTimeSlotsOverlap };
export class Util {
  public static applyDeepDefaults(data: any, defaults: any, setter: (parent: any, item: any, val: any) => void) {
      if (Array.isArray(defaults)) {
          for (const subItem in data) {
              if (data.hasOwnProperty(subItem)) {
                  Util.applyDeepDefaults(data[subItem], defaults[0], setter);
              }
          }
      } else {
          for (const item in defaults) {
              if (typeof defaults[item] === "object") {
                  const isArray = Array.isArray(defaults[item]);

                  if (!data.hasOwnProperty(item)) {
                      setter(data, item, isArray ? [] : {});
                  }

                  Util.applyDeepDefaults(data[item], defaults[item], setter);
              } else {
                  if (!data.hasOwnProperty(item)) {
                      if (typeof(defaults[item]) === "function") {
                          setter(data, item, defaults[item](data));
                      } else {
                          setter(data, item, defaults[item]);
                      }
                  }
              }
          }
      }
      return data;
  }

  public static treatAsUTC(date: Date): any {
      const result = new Date(date);
      result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
      return result;
  }

  public static daysBetween(startDate: Date , endDate: Date) {
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      return (this.treatAsUTC(endDate) - this.treatAsUTC(startDate)) / millisecondsPerDay;
  }

  public static abbreviate(stringValue: string, maxCharacters: number) {
    if (stringValue.length <= maxCharacters) {
        return stringValue;
    }
    return stringValue.substring(0, maxCharacters-1) + '…';
}
}
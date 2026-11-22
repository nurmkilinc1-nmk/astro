package com.lunagram.alarm;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.AlarmClock;
import android.provider.CalendarContract;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * luna.gram — Ay boşluğu başlangıç/bitişi için:
 *  - setAlarm: telefonun saat uygulamasına alarm kurar (AlarmClock.ACTION_SET_ALARM).
 *    Not: Android alarmları tarih değil yalnızca saat:dakika tutar; uygulama bu
 *    yüzden bu yöntemi sadece önümüzdeki 24 saat içindeki anlar için kullanır.
 *  - addCalendarEvent: takvim uygulamasını tam tarih/saatli, hatırlatıcılı bir
 *    etkinlikle açar (ileri tarihli anlar için).
 */
@CapacitorPlugin(name = "LunaAlarm")
public class LunaAlarmPlugin extends Plugin {

    @PluginMethod
    public void setAlarm(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        if (hour == null || minute == null) {
            call.reject("hour ve minute gerekli", "INVALID_ARGS");
            return;
        }
        String message = call.getString("message", "Ay Boşluğu");
        boolean skipUi = Boolean.TRUE.equals(call.getBoolean("skipUi", false));

        Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
        intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
        intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
        intent.putExtra(AlarmClock.EXTRA_MESSAGE, message);
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi);
        intent.putExtra(AlarmClock.EXTRA_VIBRATE, true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("Bu cihazda alarm kurabilen bir saat uygulaması bulunamadı", "NO_CLOCK_APP");
        } catch (SecurityException e) {
            call.reject("Alarm kurma izni yok", "NO_PERMISSION");
        }
    }

    @PluginMethod
    public void addCalendarEvent(PluginCall call) {
        Double begin = call.getDouble("begin");
        if (begin == null) {
            call.reject("begin (ms) gerekli", "INVALID_ARGS");
            return;
        }
        Double end = call.getDouble("end", begin + 15 * 60 * 1000);
        String title = call.getString("title", "Ay Boşluğu");
        String description = call.getString("description", "");
        boolean allDay = Boolean.TRUE.equals(call.getBoolean("allDay", false));

        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, begin.longValue())
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.longValue())
            .putExtra(CalendarContract.Events.TITLE, title)
            .putExtra(CalendarContract.Events.DESCRIPTION, description)
            .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, allDay)
            .putExtra(CalendarContract.Events.HAS_ALARM, allDay ? 0 : 1)
            .putExtra(CalendarContract.Events.AVAILABILITY, CalendarContract.Events.AVAILABILITY_FREE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("Bu cihazda takvim uygulaması bulunamadı", "NO_CALENDAR_APP");
        }
    }
}

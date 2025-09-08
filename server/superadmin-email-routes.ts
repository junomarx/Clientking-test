import { Request, Response } from "express";
import { Express } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { emailTemplates, emailHistory, type EmailTemplate, type InsertEmailTemplate, superadminEmailSettings, newsletters, newsletterSends, users, businessSettings, type Newsletter, type InsertNewsletter, newsletterLogos, type NewsletterLogo, type InsertNewsletterLogo } from "@shared/schema";
import { eq, desc, isNull, or, and, sql, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailService } from "./email-service";
import { ObjectStorageService } from "./objectStorage";

// E-Mail-Vorlagen Typen
type EmailTemplateType = 'app' | 'customer';

interface DefaultEmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: string[];
  type: EmailTemplateType;
}

/**
 * Standard E-Mail-Vorlagen für die App (Systemvorlagen)
 */
export const defaultAppEmailTemplates: DefaultEmailTemplate[] = [
  {
    name: "Registrierungsbestätigung",
    subject: "Ihre Registrierung bei ClientKing Handyshop Verwaltung",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIiBkPSJtMCAwaDEwMjR2MTAyNGgtMTAyNHoiIGZpbGw9IiNGQ0ZDRkMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDk3LDQ5KSIgZD0ibTAgMGg5bDEzIDQgMTAgNyA4IDkgNCAxMXYxOGwtNCAxMS05IDEwLTMgMSAxMCAxNiAyOCA0MiA5LTYgMTctMTMgMTQtMTEgMTItOS02LTE1di0xNGw0LTExIDctOSA5LTYgNy0zIDUtMWgxMGwxMiA0IDkgNyA2IDggNCAxMHYxNmwtNCAxMS05IDEwLTEwIDZoLTNsLTMgMjEtMTIgNzUtMSA0aDdsMTEgMyAxMCA2IDkgOSA4IDE2IDIgMTF2MTUwbDMgOSA3IDkgOCA2IDEwIDRoMTZsNi0zIDUtNCA2LTExIDgtNyA2LTJoNXYtOGwtNi01LTMtOCAxLTE0IDItMTEgNC02IDYtNCA3LTEgMTIgMiAxLTExIDIwLTEzNSAyLTEzdi0xM2wtNS0zMCAxLTggMTQtMzQgMTMtMzEgMTggMiA4IDIgNSA1NCAxIDE2LTQgMTMtMTEgMjctMTMgODctMTEgNzUtMSA1IDEzIDEgOCA3IDIgNXY4bC0zIDE3LTQgNi02IDUtNSAxLTEgMTAgNiAxIDEwIDYgNyA4IDQgOCAyIDl2MTRsLTMgMTgtNCAxMS02IDktNyA2LTcgM2gtM2wtMiAxNy05IDU0LTQgMTEtNiA5LTkgNy0xMiA1LTYgMWgtMTBsLTEyLTMtMTAtNi03LTctNy0xNC0xLTR2LTE0bDktNTh2LTRsLTEyIDMtOSAxaC05bC0xNi0zLTEwLTRoLTJ2MTcybC0zIDE0LTcgMTQtNyA4LTExIDctMTEgNC04IDFoLTE0bDQgMzEgMyAyNmg3bDEyIDQgOSA2IDggOSA0IDExIDEgNnYxMWwtMyA2LTYgNGgtODRsLTgtNC02LTctMy0xNi0xMS04MnYtNWgtOThsLTggNjgtNCAzMi00IDgtNSA0LTUgMmgtODRsLTctNi0xLTN2LTE3bDQtMTEgNy05IDgtNiAxMC00IDktMSAzLTI5IDEtNS00IDFoLTI5bC0yMC0zLTE4LTUtMjAtOS0xNy01LTEyLTJoLTQ4bC0xOS0zLTE4LTYtMTYtOC0xMy04LTE2LTEyLTExLTktNS00LTItM3YtN2wzLTMgMjctNSAxNS01IDE3LTggMTQtOSAxMi05IDExLTkgNy03IDYtNSA3LTggOS0xMCAxMy0xNyAxMC0xNSAyLTUtMTYtMTUtMTAtMTItNy0xMS01LTEwLTMtOS0xLTZ2LTE2bDQtMTMgNi0xMCAxMi0xNCAxNC0xMiAxNy0xMiAxOS0xMiAxOS0xMSAxLTExNCAxLTIxIDQtMTIgNi05IDctNyAxMC02IDE1LTRoNGwtNS0zMC0xMC02NnYtM2wtOS0zLTgtNi02LTgtNC0xMS0xLTV2LTlsMy0xMCA2LTkgNy02IDgtNCA3LTJoMTJsMTIgNCA5IDcgNyA5IDMgOXYxNWwtNCAxMC0zIDUgNCAyIDI4IDIyIDIwIDE1IDIgMSAyLTUgMzQtNTEtMi00LTYtOC00LTktMS00di0xN2w0LTExIDYtOCA5LTggMTAtNHoiIGZpbGw9IiMwQzM5NUMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzc4LDMxMikiIGQ9Im0wIDBoMjQ1bDggMyA2IDUgMyA2IDEgNHYzNjBsLTMgOS01IDYtNiAzLTMwIDFoLTIxMWwtMTMtMS03LTQtNS02LTItMTF2LTM1NGwyLTkgNC02IDUtNHoiIGZpbGw9IiNBMkM2RTAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzU3LDI3MSkiIGQ9Im0wIDBoMjg3bDEwIDQgNyA2IDUgOSAxIDR2NDI2bC00IDEwLTYgNy05IDUtNCAxaC0yODhsLTEwLTQtNi01LTYtMTItMS04NiAxLTE0IDYtOSA0LTExIDEtNXYtMTJsLTQtMTMtNi0xMC0xLTEtMS00NHYtMjE2bDItMTEgNC04IDgtN3ptMjEgNDEtOSAzLTYgNS0zIDYtMSA3djM1NGwyIDExIDYgNyA2IDMgMTMgMWgyMThsMjMtMSA4LTUgNS04IDEtNXYtMzYwbC0zLTgtNS02LTYtMy00LTF6IiBmaWxsPSIjMUY1NDdFIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5OSwxMjIpIiBkPSJtMCAwIDUgMSAxMCAxNiAxMCAxNSAxNiAyNSAxMyAxOSAzIDMgOCAxIDktNiAxMy0xMSAyMC0xNSAxNS0xMiA3LTUgOC0xIDEgMi0xNSA5Ny0yIDFoLTI0MGwtMy0xNi0xMi03OXYtNWw3IDEgMTkgMTQgMTUgMTIgMTQgMTEgMTAgOCA3IDVoOGwxOC0yNyAxNy0yNiAxMy0yMHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjY3LDYxNikiIGQ9Im0wIDBoMmwzIDkgNyA4IDEyIDVoMTRsMTAtMnY4M2wyIDEyIDYgMTEgNyA4IDE0IDggOSAzIDYgMWgyMnY2bC04IDFoLTI2bC0xOC0zLTE3LTUtMjAtOS0xNS00LTE5LTNoLTQ4bC0yMC00LTE1LTYtMTYtOS0xNi0xMnYtMmwxNS00IDE4LTggMTYtOSAxNC0xMCAxMS05IDEwLTkgMTYtMTYgOS0xMSA4LTEweiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMTIsNDQ2KSIgZD0ibTAgMGgydjM3bC0xMyA4LTEyIDktNyA2LTUgNy0yIDcgMSA4IDYgMTAgMTAgMTAgMTMgMTAgMTAgOCA4IDEwIDQgMTB2MTJsLTUgMTItNyA3LTggNGgtMTJsLTYtMy01LTYtMS0zdi04bDQtNSA5LTMtMy01LTE3LTE0LTEzLTEyLTEwLTExLTgtMTMtNC0xMS0xLTEzIDQtMTMgNy05IDktMTAgMTEtOSAxNy0xMiAxOS0xMnoiIGZpbGw9IiMyMDU1ODAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEyLDYzNikiIGQ9Im0wIDAgMyAxdjgybDIgMTIgNiAxMSA3IDggMTQgOCA5IDMgNiAxaDIydjZsLTggMWgtMjZsLTE4LTMtMTctNS0yMC05LTE1LTQtMTktM3YtMWwtMjUtMSA1LTdoMmwyLTQgNi04IDktMTQgOS0xNiA4LTE2IDgtMTggNy0yMCAyMC0zeiIgZmlsbD0iI0EwMzAzNSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTAsNDkwKSIgZD0ibTAgMCAyIDIgMyA5LTEgNC01IDgtMSA1djhsMyAxMCA5IDEwIDE0IDUtMiAxNi05IDU0LTQgOC03IDYtOSAzaC04bC05LTMtNi00LTQtNS0zLTh2LTlsMTUtOTEgOS00IDctOCA1LTExeiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOTksNzYzKSIgZD0ibTAgMGgzOGwtMSAxNS05IDc4LTIgNGgtNzF2LTdsNC04IDctNSA2LTIgMTgtMSA0LTI4IDUtNDF6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU3MSw3NjMpIiBkPSJtMCAwaDM4bDggNjYgMiA3IDEgMSAxOSAxIDkgMyA2IDcgMiA3djVoLTcybC0yLTUtMTEtODd6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg0NiwxMzgpIiBkPSJtMCAwaDFsNiA1NC0xNCAzNi0yNCAxNjMtMSA1aC03bC0zLTEgMS0xMiAyMy0xNTN2LTEwbC01LTI3IDEtNiAxMy0yOXoiIGZpbGw9IiNBRUNFRTQiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzY1LDQ2NSkiIGQ9Im0wIDAgNSAxIDMgNCAxIDR2MTFsLTUgMTItMyAzLTUtMS00LTZoLTFsLTYgMjktNSA0LTEwIDQtNSAxaC0xOGwtMTQtNC0xMS02di00MWw4IDYgMTMgNyA5IDJoMTZsMTAtMyAxMC03IDMtOCA1LTl6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3Niw0MDkpIiBkPSJtMCAwIDEyIDEgNDYgNy0yIDE1LTEwIDUtNCA4LTMgMTUtMTMgNy02IDctMyA4aC0xbC0yLTE1LTYtMTItMS00IDEtNnYtOGwtNC04LTUtNHYtOXoiIGZpbGw9IiNCNTNFM0UiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODE4LDQ3NykiIGQ9Im0wIDBoMTJsNyAzIDQgNSAyIDZ2MTVsLTMgMTUtNCA4LTYgNS0xMCAxLTgtMi02LTUtMS0ydi04bDQtNiA0LTJoM3YtOWwxLTQtMyAxLTUtNXYtN2w0LTZ6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5Nyw2OSkiIGQ9Im0wIDBoOGw4IDMgNyA3IDIgNXYxMmwtMyA2LTUgNS04IDRoLTlsLTktNC02LTgtMS0zdi0xM2w1LTggOC01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NjUsMjg1KSIgZD0ibTAgMGg3NGw0IDR2NmwtNCA1LTMgMWgtNjlsLTYtNC0xLTYgMy01eiIgZmlsbD0iIzBDMzk1QyIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NDAsMTAwKSIgZD0ibTAgMGgxMGw4IDQgNSA4djExbC00IDYtNSA0LTEwIDItOS0zLTYtNy0xLTJ2LTExbDUtOHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzUwLDEwMCkiIGQ9Im0wIDBoMTBsNiAzIDUgNiAxIDJ2MTJsLTQgNi01IDQtNiAyLTktMS02LTQtNC03LTEtOSA0LTggNi01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTMsNTQwKSIgZD0ibTAgMCA3IDYgMSA0LTExIDY4LTEgNC02IDEtMy0zIDYtNDIgNi0zN3oiIGZpbGw9IiNBMDMwMzUiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEzLDUwNSkiIGQ9Im0wIDAgMiAxdjM1bC01LTItMTEtOS00LTZ2LTVsOS05eiIgZmlsbD0iI0ZCRkJGQyIvPgo8L3N2Zz4K" alt="ClientKing Logo" style="height: 50px; margin-bottom: 10px;">
            <p style="color: #64748b; font-size: 16px; margin: 5px 0 0 0;">Handyshop Verwaltung</p>
          </div>
          <h2 style="color: #4f46e5; margin: 0;">Vielen Dank für Ihre Registrierung!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>vielen Dank für Ihre Registrierung bei der Handyshop Verwaltung.</p>
        
        <p>Ihre Registrierung wird aktuell von unserem Team überprüft. 
        Sobald die Überprüfung abgeschlossen ist, erhalten Sie eine Benachrichtigung per E-Mail.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername"],
    type: 'app'
  },
  {
    name: "Konto freigeschaltet",
    subject: "Ihr ClientKing Konto wurde freigeschaltet",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIiBkPSJtMCAwaDEwMjR2MTAyNGgtMTAyNHoiIGZpbGw9IiNGQ0ZDRkMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDk3LDQ5KSIgZD0ibTAgMGg5bDEzIDQgMTAgNyA4IDkgNCAxMXYxOGwtNCAxMS05IDEwLTMgMSAxMCAxNiAyOCA0MiA5LTYgMTctMTMgMTQtMTEgMTItOS02LTE1di0xNGw0LTExIDctOSA5LTYgNy0zIDUtMWgxMGwxMiA0IDkgNyA2IDggNCAxMHYxNmwtNCAxMS05IDEwLTEwIDZoLTNsLTMgMjEtMTIgNzUtMSA0aDdsMTEgMyAxMCA2IDkgOSA4IDE2IDIgMTF2MTUwbDMgOSA3IDkgOCA2IDEwIDRoMTZsNi0zIDUtNCA2LTExIDgtNyA2LTJoNXYtOGwtNi01LTMtOCAxLTE0IDItMTEgNC02IDYtNCA3LTEgMTIgMiAxLTExIDIwLTEzNSAyLTEzdi0xM2wtNS0zMCAxLTggMTQtMzQgMTMtMzEgMTggMiA4IDIgNSA1NCAxIDE2LTQgMTMtMTEgMjctMTMgODctMTEgNzUtMSA1IDEzIDEgOCA3IDIgNXY4bC0zIDE3LTQgNi02IDUtNSAxLTEgMTAgNiAxIDEwIDYgNyA4IDQgOCAyIDl2MTRsLTMgMTgtNCAxMS02IDktNyA2LTcgM2gtM2wtMiAxNy05IDU0LTQgMTEtNiA5LTkgNy0xMiA1LTYgMWgtMTBsLTEyLTMtMTAtNi03LTctNy0xNC0xLTR2LTE0bDktNTh2LTRsLTEyIDMtOSAxaC05bC0xNi0zLTEwLTRoLTJ2MTcybC0zIDE0LTcgMTQtNyA4LTExIDctMTEgNC04IDFoLTE0bDQgMzEgMyAyNmg3bDEyIDQgOSA2IDggOSA0IDExIDEgNnYxMWwtMyA2LTYgNGgtODRsLTgtNC02LTctMy0xNi0xMS04MnYtNWgtOThsLTggNjgtNCAzMi00IDgtNSA0LTUgMmgtODRsLTctNi0xLTN2LTE3bDQtMTEgNy05IDgtNiAxMC00IDktMSAzLTI5IDEtNS00IDFoLTI5bC0yMC0zLTE4LTUtMjAtOS0xNy01LTEyLTJoLTQ4bC0xOS0zLTE4LTYtMTYtOC0xMy04LTE2LTEyLTExLTktNS00LTItM3YtN2wzLTMgMjctNSAxNS01IDE3LTggMTQtOSAxMi05IDExLTkgNy03IDYtNSA3LTggOS0xMCAxMy0xNyAxMC0xNSAyLTUtMTYtMTUtMTAtMTItNy0xMS01LTEwLTMtOS0xLTZ2LTE2bDQtMTMgNi0xMCAxMi0xNCAxNC0xMiAxNy0xMiAxOS0xMiAxOS0xMSAxLTExNCAxLTIxIDQtMTIgNi05IDctNyAxMC02IDE1LTRoNGwtNS0zMC0xMC02NnYtM2wtOS0zLTgtNi02LTgtNC0xMS0xLTV2LTlsMy0xMCA2LTkgNy02IDgtNCA3LTJoMTJsMTIgNCA5IDcgNyA5IDMgOXYxNWwtNCAxMC0zIDUgNCAyIDI4IDIyIDIwIDE1IDIgMSAyLTUgMzQtNTEtMi00LTYtOC00LTktMS00di0xN2w0LTExIDYtOCA5LTggMTAtNHoiIGZpbGw9IiMwQzM5NUMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzc4LDMxMikiIGQ9Im0wIDBoMjQ1bDggMyA2IDUgMyA2IDEgNHYzNjBsLTMgOS01IDYtNiAzLTMwIDFoLTIxMWwtMTMtMS03LTQtNS02LTItMTF2LTM1NGwyLTkgNC02IDUtNHoiIGZpbGw9IiNBMkM2RTAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzU3LDI3MSkiIGQ9Im0wIDBoMjg3bDEwIDQgNyA2IDUgOSAxIDR2NDI2bC00IDEwLTYgNy05IDUtNCAxaC0yODhsLTEwLTQtNi01LTYtMTItMS04NiAxLTE0IDYtOSA0LTExIDEtNXYtMTJsLTQtMTMtNi0xMC0xLTEtMS00NHYtMjE2bDItMTEgNC04IDgtN3ptMjEgNDEtOSAzLTYgNS0zIDYtMSA3djM1NGwyIDExIDYgNyA2IDMgMTMgMWgyMThsMjMtMSA4LTUgNS04IDEtNXYtMzYwbC0zLTgtNS02LTYtMy00LTF6IiBmaWxsPSIjMUY1NDdFIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5OSwxMjIpIiBkPSJtMCAwIDUgMSAxMCAxNiAxMCAxNSAxNiAyNSAxMyAxOSAzIDMgOCAxIDktNiAxMy0xMSAyMC0xNSAxNS0xMiA3LTUgOC0xIDEgMi0xNSA5Ny0yIDFoLTI0MGwtMy0xNi0xMi03OXYtNWw3IDEgMTkgMTQgMTUgMTIgMTQgMTEgMTAgOCA3IDVoOGwxOC0yNyAxNy0yNiAxMy0yMHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjY3LDYxNikiIGQ9Im0wIDBoMmwzIDkgNyA4IDEyIDVoMTRsMTAtMnY4M2wyIDEyIDYgMTEgNyA4IDE0IDggOSAzIDYgMWgyMnY2bC04IDFoLTI2bC0xOC0zLTE3LTUtMjAtOS0xNS00LTE5LTNoLTQ4bC0yMC00LTE1LTYtMTYtOS0xNi0xMnYtMmwxNS00IDE4LTggMTYtOSAxNC0xMCAxMS05IDEwLTkgMTYtMTYgOS0xMSA4LTEweiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMTIsNDQ2KSIgZD0ibTAgMGgydjM3bC0xMyA4LTEyIDktNyA2LTUgNy0yIDcgMSA4IDYgMTAgMTAgMTAgMTMgMTAgMTAgOCA4IDEwIDQgMTB2MTJsLTUgMTItNyA3LTggNGgtMTJsLTYtMy01LTYtMS0zdi04bDQtNSA5LTMtMy01LTE3LTE0LTEzLTEyLTEwLTExLTgtMTMtNC0xMS0xLTEzIDQtMTMgNy05IDktMTAgMTEtOSAxNy0xMiAxOS0xMnoiIGZpbGw9IiMyMDU1ODAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEyLDYzNikiIGQ9Im0wIDAgMyAxdjgybDIgMTIgNiAxMSA3IDggMTQgOCA5IDMgNiAxaDIydjZsLTggMWgtMjZsLTE4LTMtMTctNS0yMC05LTE1LTQtMTktM3YtMWwtMjUtMSA1LTdoMmwyLTQgNi04IDktMTQgOS0xNiA4LTE2IDgtMTggNy0yMCAyMC0zeiIgZmlsbD0iI0EwMzAzNSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTAsNDkwKSIgZD0ibTAgMCAyIDIgMyA5LTEgNC01IDgtMSA1djhsMyAxMCA5IDEwIDE0IDUtMiAxNi05IDU0LTQgOC03IDYtOSAzaC04bC05LTMtNi00LTQtNS0zLTh2LTlsMTUtOTEgOS00IDctOCA1LTExeiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOTksNzYzKSIgZD0ibTAgMGgzOGwtMSAxNS05IDc4LTIgNGgtNzF2LTdsNC04IDctNSA2LTIgMTgtMSA0LTI4IDUtNDF6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU3MSw3NjMpIiBkPSJtMCAwaDM4bDggNjYgMiA3IDEgMSAxOSAxIDkgMyA2IDcgMiA3djVoLTcybC0yLTUtMTEtODd6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg0NiwxMzgpIiBkPSJtMCAwaDFsNiA1NC0xNCAzNi0yNCAxNjMtMSA1aC03bC0zLTEgMS0xMiAyMy0xNTN2LTEwbC01LTI3IDEtNiAxMy0yOXoiIGZpbGw9IiNBRUNFRTQiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzY1LDQ2NSkiIGQ9Im0wIDAgNSAxIDMgNCAxIDR2MTFsLTUgMTItMyAzLTUtMS00LTZoLTFsLTYgMjktNSA0LTEwIDQtNSAxaC0xOGwtMTQtNC0xMS02di00MWw4IDYgMTMgNyA5IDJoMTZsMTAtMyAxMC03IDMtOCA1LTl6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3Niw0MDkpIiBkPSJtMCAwIDEyIDEgNDYgNy0yIDE1LTEwIDUtNCA4LTMgMTUtMTMgNy02IDctMyA4aC0xbC0yLTE1LTYtMTItMS00IDEtNnYtOGwtNC04LTUtNHYtOXoiIGZpbGw9IiNCNTNFM0UiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODE4LDQ3NykiIGQ9Im0wIDBoMTJsNyAzIDQgNSAyIDZ2MTVsLTMgMTUtNCA4LTYgNS0xMCAxLTgtMi02LTUtMS0ydi04bDQtNiA0LTJoM3YtOWwxLTQtMyAxLTUtNXYtN2w0LTZ6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5Nyw2OSkiIGQ9Im0wIDBoOGw4IDMgNyA3IDIgNXYxMmwtMyA2LTUgNS04IDRoLTlsLTktNC02LTgtMS0zdi0xM2w1LTggOC01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NjUsMjg1KSIgZD0ibTAgMGg3NGw0IDR2NmwtNCA1LTMgMWgtNjlsLTYtNC0xLTYgMy01eiIgZmlsbD0iIzBDMzk1QyIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NDAsMTAwKSIgZD0ibTAgMGgxMGw4IDQgNSA4djExbC00IDYtNSA0LTEwIDItOS0zLTYtNy0xLTJ2LTExbDUtOHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzUwLDEwMCkiIGQ9Im0wIDBoMTBsNiAzIDUgNiAxIDJ2MTJsLTQgNi01IDQtNiAyLTktMS02LTQtNC03LTEtOSA0LTggNi01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTMsNTQwKSIgZD0ibTAgMCA3IDYgMSA0LTExIDY4LTEgNC02IDEtMy0zIDYtNDIgNi0zN3oiIGZpbGw9IiNBMDMwMzUiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEzLDUwNSkiIGQ9Im0wIDAgMiAxdjM1bC01LTItMTEtOS00LTZ2LTVsOS05eiIgZmlsbD0iI0ZCRkJGQyIvPgo8L3N2Zz4K" alt="ClientKing Logo" style="height: 50px; margin-bottom: 10px;">
            <p style="color: #64748b; font-size: 16px; margin: 5px 0 0 0;">Handyshop Verwaltung</p>
          </div>
          <h2 style="color: #16a34a; margin: 0;">✓ Ihr Konto wurde freigeschaltet!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{vorname}} {{nachname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihr Konto bei der Handyshop Verwaltung nun freigeschaltet wurde.</p>
        
        <p>Sie können sich ab sofort über folgenden Link anmelden:</p>
        
        <p style="text-align: center;">
          <a href="{{loginLink}}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Jetzt anmelden
          </a>
        </p>
        
        <p>Wir wünschen Ihnen viel Erfolg mit der Handyshop Verwaltung!</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["vorname", "nachname", "loginLink"],
    type: 'app'
  },
  {
    name: "Passwort zurücksetzen",
    subject: "Passwort zurücksetzen - ClientKing Handyshop Verwaltung",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIiBkPSJtMCAwaDEwMjR2MTAyNGgtMTAyNHoiIGZpbGw9IiNGQ0ZDRkMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDk3LDQ5KSIgZD0ibTAgMGg5bDEzIDQgMTAgNyA4IDkgNCAxMXYxOGwtNCAxMS05IDEwLTMgMSAxMCAxNiAyOCA0MiA5LTYgMTctMTMgMTQtMTEgMTItOS02LTE1di0xNGw0LTExIDctOSA5LTYgNy0zIDUtMWgxMGwxMiA0IDkgNyA2IDggNCAxMHYxNmwtNCAxMS05IDEwLTEwIDZoLTNsLTMgMjEtMTIgNzUtMSA0aDdsMTEgMyAxMCA2IDkgOSA4IDE2IDIgMTF2MTUwbDMgOSA3IDkgOCA2IDEwIDRoMTZsNi0zIDUtNCA2LTExIDgtNyA2LTJoNXYtOGwtNi01LTMtOCAxLTE0IDItMTEgNC02IDYtNCA3LTEgMTIgMiAxLTExIDIwLTEzNSAyLTEzdi0xM2wtNS0zMCAxLTggMTQtMzQgMTMtMzEgMTggMiA4IDIgNSA1NCAxIDE2LTQgMTMtMTEgMjctMTMgODctMTEgNzUtMSA1IDEzIDEgOCA3IDIgNXY4bC0zIDE3LTQgNi02IDUtNSAxLTEgMTAgNiAxIDEwIDYgNyA4IDQgOCAyIDl2MTRsLTMgMTgtNCAxMS02IDktNyA2LTcgM2gtM2wtMiAxNy05IDU0LTQgMTEtNiA5LTkgNy0xMiA1LTYgMWgtMTBsLTEyLTMtMTAtNi03LTctNy0xNC0xLTR2LTE0bDktNTh2LTRsLTEyIDMtOSAxaC05bC0xNi0zLTEwLTRoLTJ2MTcybC0zIDE0LTcgMTQtNyA4LTExIDctMTEgNC04IDFoLTE0bDQgMzEgMyAyNmg3bDEyIDQgOSA2IDggOSA0IDExIDEgNnYxMWwtMyA2LTYgNGgtODRsLTgtNC02LTctMy0xNi0xMS04MnYtNWgtOThsLTggNjgtNCAzMi00IDgtNSA0LTUgMmgtODRsLTctNi0xLTN2LTE3bDQtMTEgNy05IDgtNiAxMC00IDktMSAzLTI5IDEtNS00IDFoLTI5bC0yMC0zLTE4LTUtMjAtOS0xNy01LTEyLTJoLTQ4bC0xOS0zLTE4LTYtMTYtOC0xMy04LTE2LTEyLTExLTktNS00LTItM3YtN2wzLTMgMjctNSAxNS01IDE3LTggMTQtOSAxMi05IDExLTkgNy03IDYtNSA3LTggOS0xMCAxMy0xNyAxMC0xNSAyLTUtMTYtMTUtMTAtMTItNy0xMS01LTEwLTMtOS0xLTZ2LTE2bDQtMTMgNi0xMCAxMi0xNCAxNC0xMiAxNy0xMiAxOS0xMiAxOS0xMSAxLTExNCAxLTIxIDQtMTIgNi05IDctNyAxMC02IDE1LTRoNGwtNS0zMC0xMC02NnYtM2wtOS0zLTgtNi02LTgtNC0xMS0xLTV2LTlsMy0xMCA2LTkgNy02IDgtNCA3LTJoMTJsMTIgNCA5IDcgNyA5IDMgOXYxNWwtNCAxMC0zIDUgNCAyIDI4IDIyIDIwIDE1IDIgMSAyLTUgMzQtNTEtMi00LTYtOC00LTktMS00di0xN2w0LTExIDYtOCA5LTggMTAtNHoiIGZpbGw9IiMwQzM5NUMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzc4LDMxMikiIGQ9Im0wIDBoMjQ1bDggMyA2IDUgMyA2IDEgNHYzNjBsLTMgOS01IDYtNiAzLTMwIDFoLTIxMWwtMTMtMS03LTQtNS02LTItMTF2LTM1NGwyLTkgNC02IDUtNHoiIGZpbGw9IiNBMkM2RTAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzU3LDI3MSkiIGQ9Im0wIDBoMjg3bDEwIDQgNyA2IDUgOSAxIDR2NDI2bC00IDEwLTYgNy05IDUtNCAxaC0yODhsLTEwLTQtNi01LTYtMTItMS04NiAxLTE0IDYtOSA0LTExIDEtNXYtMTJsLTQtMTMtNi0xMC0xLTEtMS00NHYtMjE2bDItMTEgNC04IDgtN3ptMjEgNDEtOSAzLTYgNS0zIDYtMSA3djM1NGwyIDExIDYgNyA2IDMgMTMgMWgyMThsMjMtMSA4LTUgNS04IDEtNXYtMzYwbC0zLTgtNS02LTYtMy00LTF6IiBmaWxsPSIjMUY1NDdFIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5OSwxMjIpIiBkPSJtMCAwIDUgMSAxMCAxNiAxMCAxNSAxNiAyNSAxMyAxOSAzIDMgOCAxIDktNiAxMy0xMSAyMC0xNSAxNS0xMiA3LTUgOC0xIDEgMi0xNSA5Ny0yIDFoLTI0MGwtMy0xNi0xMi03OXYtNWw3IDEgMTkgMTQgMTUgMTIgMTQgMTEgMTAgOCA3IDVoOGwxOC0yNyAxNy0yNiAxMy0yMHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjY3LDYxNikiIGQ9Im0wIDBoMmwzIDkgNyA4IDEyIDVoMTRsMTAtMnY4M2wyIDEyIDYgMTEgNyA4IDE0IDggOSAzIDYgMWgyMnY2bC04IDFoLTI2bC0xOC0zLTE3LTUtMjAtOS0xNS00LTE5LTNoLTQ4bC0yMC00LTE1LTYtMTYtOS0xNi0xMnYtMmwxNS00IDE4LTggMTYtOSAxNC0xMCAxMS05IDEwLTkgMTYtMTYgOS0xMSA4LTEweiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMTIsNDQ2KSIgZD0ibTAgMGgydjM3bC0xMyA4LTEyIDktNyA2LTUgNy0yIDcgMSA4IDYgMTAgMTAgMTAgMTMgMTAgMTAgOCA4IDEwIDQgMTB2MTJsLTUgMTItNyA3LTggNGgtMTJsLTYtMy01LTYtMS0zdi04bDQtNSA5LTMtMy01LTE3LTE0LTEzLTEyLTEwLTExLTgtMTMtNC0xMS0xLTEzIDQtMTMgNy05IDktMTAgMTEtOSAxNy0xMiAxOS0xMnoiIGZpbGw9IiMyMDU1ODAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEyLDYzNikiIGQ9Im0wIDAgMyAxdjgybDIgMTIgNiAxMSA3IDggMTQgOCA5IDMgNiAxaDIydjZsLTggMWgtMjZsLTE4LTMtMTctNS0yMC05LTE1LTQtMTktM3YtMWwtMjUtMSA1LTdoMmwyLTQgNi04IDktMTQgOS0xNiA4LTE2IDgtMTggNy0yMCAyMC0zeiIgZmlsbD0iI0EwMzAzNSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTAsNDkwKSIgZD0ibTAgMCAyIDIgMyA5LTEgNC01IDgtMSA1djhsMyAxMCA5IDEwIDE0IDUtMiAxNi05IDU0LTQgOC03IDYtOSAzaC04bC05LTMtNi00LTQtNS0zLTh2LTlsMTUtOTEgOS00IDctOCA1LTExeiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOTksNzYzKSIgZD0ibTAgMGgzOGwtMSAxNS05IDc4LTIgNGgtNzF2LTdsNC04IDctNSA2LTIgMTgtMSA0LTI4IDUtNDF6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU3MSw3NjMpIiBkPSJtMCAwaDM4bDggNjYgMiA3IDEgMSAxOSAxIDkgMyA2IDcgMiA3djVoLTcybC0yLTUtMTEtODd6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg0NiwxMzgpIiBkPSJtMCAwaDFsNiA1NC0xNCAzNi0yNCAxNjMtMSA1aC03bC0zLTEgMS0xMiAyMy0xNTN2LTEwbC01LTI3IDEtNiAxMy0yOXoiIGZpbGw9IiNBRUNFRTQiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzY1LDQ2NSkiIGQ9Im0wIDAgNSAxIDMgNCAxIDR2MTFsLTUgMTItMyAzLTUtMS00LTZoLTFsLTYgMjktNSA0LTEwIDQtNSAxaC0xOGwtMTQtNC0xMS02di00MWw4IDYgMTMgNyA5IDJoMTZsMTAtMyAxMC03IDMtOCA1LTl6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3Niw0MDkpIiBkPSJtMCAwIDEyIDEgNDYgNy0yIDE1LTEwIDUtNCA4LTMgMTUtMTMgNy02IDctMyA4aC0xbC0yLTE1LTYtMTItMS00IDEtNnYtOGwtNC04LTUtNHYtOXoiIGZpbGw9IiNCNTNFM0UiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODE4LDQ3NykiIGQ9Im0wIDBoMTJsNyAzIDQgNSAyIDZ2MTVsLTMgMTUtNCA4LTYgNS0xMCAxLTgtMi02LTUtMS0ydi04bDQtNiA0LTJoM3YtOWwxLTQtMyAxLTUtNXYtN2w0LTZ6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5Nyw2OSkiIGQ9Im0wIDBoOGw4IDMgNyA3IDIgNXYxMmwtMyA2LTUgNS04IDRoLTlsLTktNC02LTgtMS0zdi0xM2w1LTggOC01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NjUsMjg1KSIgZD0ibTAgMGg3NGw0IDR2NmwtNCA1LTMgMWgtNjlsLTYtNC0xLTYgMy01eiIgZmlsbD0iIzBDMzk1QyIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NDAsMTAwKSIgZD0ibTAgMGgxMGw4IDQgNSA4djExbC00IDYtNSA0LTEwIDItOS0zLTYtNy0xLTJ2LTExbDUtOHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzUwLDEwMCkiIGQ9Im0wIDBoMTBsNiAzIDUgNiAxIDJ2MTJsLTQgNi01IDQtNiAyLTktMS02LTQtNC03LTEtOSA0LTggNi01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTMsNTQwKSIgZD0ibTAgMCA3IDYgMSA0LTExIDY4LTEgNC02IDEtMy0zIDYtNDIgNi0zN3oiIGZpbGw9IiNBMDMwMzUiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEzLDUwNSkiIGQ9Im0wIDAgMiAxdjM1bC01LTItMTEtOS00LTZ2LTVsOS05eiIgZmlsbD0iI0ZCRkJGQyIvPgo8L3N2Zz4K" alt="ClientKing Logo" style="height: 50px; margin-bottom: 10px;">
            <p style="color: #64748b; font-size: 16px; margin: 5px 0 0 0;">Handyshop Verwaltung</p>
          </div>
          <h2 style="color: #4f46e5; margin: 0;">Passwort zurücksetzen</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto erhalten. 
        Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf den folgenden Link:</p>
        
        <p style="text-align: center;">
          <a href="{{resetLink}}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Passwort zurücksetzen
          </a>
        </p>
        
        <p>Der Link ist 15 Minuten gültig. Falls Sie keine Anfrage zum Zurücksetzen Ihres Passworts gestellt haben, können Sie diese E-Mail ignorieren.</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername", "resetLink"],
    type: 'app'
  },
  {
    name: "Passwort erfolgreich geändert",
    subject: "Passwort erfolgreich geändert - ClientKing Handyshop Verwaltung",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIiBkPSJtMCAwaDEwMjR2MTAyNGgtMTAyNHoiIGZpbGw9IiNGQ0ZDRkMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDk3LDQ5KSIgZD0ibTAgMGg5bDEzIDQgMTAgNyA4IDkgNCAxMXYxOGwtNCAxMS05IDEwLTMgMSAxMCAxNiAyOCA0MiA5LTYgMTctMTMgMTQtMTEgMTItOS02LTE1di0xNGw0LTExIDctOSA5LTYgNy0zIDUtMWgxMGwxMiA0IDkgNyA2IDggNCAxMHYxNmwtNCAxMS05IDEwLTEwIDZoLTNsLTMgMjEtMTIgNzUtMSA0aDdsMTEgMyAxMCA2IDkgOSA4IDE2IDIgMTF2MTUwbDMgOSA3IDkgOCA2IDEwIDRoMTZsNi0zIDUtNCA2LTExIDgtNyA2LTJoNXYtOGwtNi01LTMtOCAxLTE0IDItMTEgNC02IDYtNCA3LTEgMTIgMiAxLTExIDIwLTEzNSAyLTEzdi0xM2wtNS0zMCAxLTggMTQtMzQgMTMtMzEgMTggMiA4IDIgNSA1NCAxIDE2LTQgMTMtMTEgMjctMTMgODctMTEgNzUtMSA1IDEzIDEgOCA3IDIgNXY4bC0zIDE3LTQgNi02IDUtNSAxLTEgMTAgNiAxIDEwIDYgNyA4IDQgOCAyIDl2MTRsLTMgMTgtNCAxMS02IDktNyA2LTcgM2gtM2wtMiAxNy05IDU0LTQgMTEtNiA5LTkgNy0xMiA1LTYgMWgtMTBsLTEyLTMtMTAtNi03LTctNy0xNC0xLTR2LTE0bDktNTh2LTRsLTEyIDMtOSAxaC05bC0xNi0zLTEwLTRoLTJ2MTcybC0zIDE0LTcgMTQtNyA4LTExIDctMTEgNC04IDFoLTE0bDQgMzEgMyAyNmg3bDEyIDQgOSA2IDggOSA0IDExIDEgNnYxMWwtMyA2LTYgNGgtODRsLTgtNC02LTctMy0xNi0xMS04MnYtNWgtOThsLTggNjgtNCAzMi00IDgtNSA0LTUgMmgtODRsLTctNi0xLTN2LTE3bDQtMTEgNy05IDgtNiAxMC00IDktMSAzLTI5IDEtNS00IDFoLTI5bC0yMC0zLTE4LTUtMjAtOS0xNy01LTEyLTJoLTQ4bC0xOS0zLTE4LTYtMTYtOC0xMy04LTE2LTEyLTExLTktNS00LTItM3YtN2wzLTMgMjctNSAxNS01IDE3LTggMTQtOSAxMi05IDExLTkgNy03IDYtNSA3LTggOS0xMCAxMy0xNyAxMC0xNSAyLTUtMTYtMTUtMTAtMTItNy0xMS01LTEwLTMtOS0xLTZ2LTE2bDQtMTMgNi0xMCAxMi0xNCAxNC0xMiAxNy0xMiAxOS0xMiAxOS0xMSAxLTExNCAxLTIxIDQtMTIgNi05IDctNyAxMC02IDE1LTRoNGwtNS0zMC0xMC02NnYtM2wtOS0zLTgtNi02LTgtNC0xMS0xLTV2LTlsMy0xMCA2LTkgNy02IDgtNCA3LTJoMTJsMTIgNCA5IDcgNyA5IDMgOXYxNWwtNCAxMC0zIDUgNCAyIDI4IDIyIDIwIDE1IDIgMSAyLTUgMzQtNTEtMi00LTYtOC00LTktMS00di0xN2w0LTExIDYtOCA5LTggMTAtNHoiIGZpbGw9IiMwQzM5NUMiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzc4LDMxMikiIGQ9Im0wIDBoMjQ1bDggMyA2IDUgMyA2IDEgNHYzNjBsLTMgOS01IDYtNiAzLTMwIDFoLTIxMWwtMTMtMS03LTQtNS02LTItMTF2LTM1NGwyLTkgNC02IDUtNHoiIGZpbGw9IiNBMkM2RTAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzU3LDI3MSkiIGQ9Im0wIDBoMjg3bDEwIDQgNyA2IDUgOSAxIDR2NDI2bC00IDEwLTYgNy05IDUtNCAxaC0yODhsLTEwLTQtNi01LTYtMTItMS04NiAxLTE0IDYtOSA0LTExIDEtNXYtMTJsLTQtMTMtNi0xMC0xLTEtMS00NHYtMjE2bDItMTEgNC04IDgtN3ptMjEgNDEtOSAzLTYgNS0zIDYtMSA3djM1NGwyIDExIDYgNyA2IDMgMTMgMWgyMThsMjMtMSA4LTUgNS04IDEtNXYtMzYwbC0zLTgtNS02LTYtMy00LTF6IiBmaWxsPSIjMUY1NDdFIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5OSwxMjIpIiBkPSJtMCAwIDUgMSAxMCAxNiAxMCAxNSAxNiAyNSAxMyAxOSAzIDMgOCAxIDktNiAxMy0xMSAyMC0xNSAxNS0xMiA3LTUgOC0xIDEgMi0xNSA5Ny0yIDFoLTI0MGwtMy0xNi0xMi03OXYtNWw3IDEgMTkgMTQgMTUgMTIgMTQgMTEgMTAgOCA3IDVoOGwxOC0yNyAxNy0yNiAxMy0yMHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjY3LDYxNikiIGQ9Im0wIDBoMmwzIDkgNyA4IDEyIDVoMTRsMTAtMnY4M2wyIDEyIDYgMTEgNyA4IDE0IDggOSAzIDYgMWgyMnY2bC04IDFoLTI2bC0xOC0zLTE3LTUtMjAtOS0xNS00LTE5LTNoLTQ4bC0yMC00LTE1LTYtMTYtOS0xNi0xMnYtMmwxNS00IDE4LTggMTYtOSAxNC0xMCAxMS05IDEwLTkgMTYtMTYgOS0xMSA4LTEweiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMTIsNDQ2KSIgZD0ibTAgMGgydjM3bC0xMyA4LTEyIDktNyA2LTUgNy0yIDcgMSA4IDYgMTAgMTAgMTAgMTMgMTAgMTAgOCA4IDEwIDQgMTB2MTJsLTUgMTItNyA3LTggNGgtMTJsLTYtMy01LTYtMS0zdi04bDQtNSA5LTMtMy01LTE3LTE0LTEzLTEyLTEwLTExLTgtMTMtNC0xMS0xLTEzIDQtMTMgNy05IDktMTAgMTEtOSAxNy0xMiAxOS0xMnoiIGZpbGw9IiMyMDU1ODAiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEyLDYzNikiIGQ9Im0wIDAgMyAxdjgybDIgMTIgNiAxMSA3IDggMTQgOCA5IDMgNiAxaDIydjZsLTggMWgtMjZsLTE4LTMtMTctNS0yMC05LTE1LTQtMTktM3YtMWwtMjUtMSA1LTdoMmwyLTQgNi04IDktMTQgOS0xNiA4LTE2IDgtMTggNy0yMCAyMC0zeiIgZmlsbD0iI0EwMzAzNSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTAsNDkwKSIgZD0ibTAgMCAyIDIgMyA5LTEgNC01IDgtMSA1djhsMyAxMCA5IDEwIDE0IDUtMiAxNi05IDU0LTQgOC03IDYtOSAzaC04bC05LTMtNi00LTQtNS0zLTh2LTlsMTUtOTEgOS00IDctOCA1LTExeiIgZmlsbD0iI0I1M0UzRSIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOTksNzYzKSIgZD0ibTAgMGgzOGwtMSAxNS05IDc4LTIgNGgtNzF2LTdsNC04IDctNSA2LTIgMTgtMSA0LTI4IDUtNDF6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU3MSw3NjMpIiBkPSJtMCAwaDM4bDggNjYgMiA3IDEgMSAxOSAxIDkgMyA2IDcgMiA3djVoLTcybC0yLTUtMTEtODd6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg0NiwxMzgpIiBkPSJtMCAwaDFsNiA1NC0xNCAzNi0yNCAxNjMtMSA1aC03bC0zLTEgMS0xMiAyMy0xNTN2LTEwbC01LTI3IDEtNiAxMy0yOXoiIGZpbGw9IiNBRUNFRTQiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzY1LDQ2NSkiIGQ9Im0wIDAgNSAxIDMgNCAxIDR2MTFsLTUgMTItMyAzLTUtMS00LTZoLTFsLTYgMjktNSA0LTEwIDQtNSAxaC0xOGwtMTQtNC0xMS02di00MWw4IDYgMTMgNyA5IDJoMTZsMTAtMyAxMC03IDMtOCA1LTl6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3Niw0MDkpIiBkPSJtMCAwIDEyIDEgNDYgNy0yIDE1LTEwIDUtNCA4LTMgMTUtMTMgNy02IDctMyA4aC0xbC0yLTE1LTYtMTItMS00IDEtNnYtOGwtNC04LTUtNHYtOXoiIGZpbGw9IiNCNTNFM0UiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODE4LDQ3NykiIGQ9Im0wIDBoMTJsNyAzIDQgNSAyIDZ2MTVsLTMgMTUtNCA4LTYgNS0xMCAxLTgtMi02LTUtMS0ydi04bDQtNiA0LTJoM3YtOWwxLTQtMyAxLTUtNXYtN2w0LTZ6IiBmaWxsPSIjMjA1NTgwIi8+CjxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ5Nyw2OSkiIGQ9Im0wIDBoOGw4IDMgNyA3IDIgNXYxMmwtMyA2LTUgNS04IDRoLTlsLTktNC02LTgtMS0zdi0xM2w1LTggOC01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NjUsMjg1KSIgZD0ibTAgMGg3NGw0IDR2NmwtNCA1LTMgMWgtNjlsLTYtNC0xLTYgMy01eiIgZmlsbD0iIzBDMzk1QyIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NDAsMTAwKSIgZD0ibTAgMGgxMGw4IDQgNSA4djExbC00IDYtNSA0LTEwIDItOS0zLTYtNy0xLTJ2LTExbDUtOHoiIGZpbGw9IiNGMkI2MjgiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzUwLDEwMCkiIGQ9Im0wIDBoMTBsNiAzIDUgNiAxIDJ2MTJsLTQgNi01IDQtNiAyLTktMS02LTQtNC03LTEtOSA0LTggNi01eiIgZmlsbD0iI0YyQjYyOCIvPgo8cGF0aCB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OTMsNTQwKSIgZD0ibTAgMCA3IDYgMSA0LTExIDY4LTEgNC02IDEtMy0zIDYtNDIgNi0zN3oiIGZpbGw9IiNBMDMwMzUiLz4KPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEzLDUwNSkiIGQ9Im0wIDAgMiAxdjM1bC01LTItMTEtOS00LTZ2LTVsOS05eiIgZmlsbD0iI0ZCRkJGQyIvPgo8L3N2Zz4K" alt="ClientKing Logo" style="height: 50px; margin-bottom: 10px;">
            <p style="color: #64748b; font-size: 16px; margin: 5px 0 0 0;">Handyshop Verwaltung</p>
          </div>
          <h2 style="color: #16a34a; margin: 0;">✓ Passwort erfolgreich geändert</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>Ihr Passwort wurde erfolgreich zurückgesetzt.</p>
        
        <p>Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich sofort an den Support.</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr ClientKing Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername"],
    type: 'app'
  }
];

/**
 * Standard E-Mail-Vorlagen für Kundenkommunikation
 */
export const defaultCustomerEmailTemplates: DefaultEmailTemplate[] = [
  {
    name: "Bewertungen anfragen",
    subject: "Feedback zu Ihrer Reparatur",
    body: `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bewerten Sie unsere Reparaturleistung</title>
    <style>
        body, p, h1, h2, h3, h4, h5, h6, table, td, div, span {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        
        body {
            background-color: #f7f7f7;
            color: #333333;
        }
        
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .header {
            padding: 25px 20px;
            text-align: center;
            background-color: #f0f7ff;
        }
        
        .content {
            padding: 30px;
        }
        
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999999;
            background-color: #f5f5f5;
        }
        
        h1 {
            color: #2c5aa0;
            font-size: 22px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        p {
            margin-bottom: 15px;
            font-size: 15px;
            text-align: left;
        }
        
        .button-container {
            margin: 25px 0;
            text-align: center;
        }
        
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5aa0;
            color: white;
            text-decoration: none;
            font-weight: normal;
            font-size: 15px;
            border-radius: 4px;
        }
        
        .thank-you {
            margin-top: 30px;
            font-style: italic;
            color: #555;
            text-align: center;
        }
        
        .contact-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
        }
        
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 25px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{logo}}" alt="{{geschaeftsname}}" class="logo">
        </div>
        
        <div class="content">
            <h1>Feedback zu Ihrer Reparatur</h1>
            
            <p>Sehr geehrte(r) {{kundenname}},</p>
            
            <p>wir hoffen, dass Ihr {{geraet}} von {{hersteller}} nach der Reparatur wieder einwandfrei funktioniert und Sie mit unserem Service zufrieden sind.</p>
            
            <p>Um unsere Leistungen kontinuierlich zu verbessern, würden wir uns sehr über Ihre Bewertung freuen. Ihre Meinung hilft uns und anderen Kunden.</p>
            
            <div class="button-container">
                <a href="{{bewertungslink}}" class="button">Bewertung abgeben</a>
            </div>
            
            <p>Sollten Sie Fragen oder Anregungen haben, können Sie uns jederzeit kontaktieren.</p>
            
            <div class="divider"></div>
            
            <div class="contact-info">
                <p><strong>{{geschaeftsname}}</strong><br>
                {{adresse}}<br>
                Telefon: <a href="tel:{{telefon}}">{{telefon}}</a><br>
                E-Mail: <a href="mailto:{{email}}">{{email}}</a><br>
                <a href="{{website}}">{{website}}</a></p>
            </div>
            
            <p class="thank-you">Vielen Dank für Ihr Vertrauen!</p>
        </div>
        
        <div class="footer">
            <p>Sie erhalten diese E-Mail, weil Sie unseren Service in Anspruch genommen haben.<br>
            © {{geschaeftsname}} {{aktuellesJahr}} | <a href="{{datenschutzlink}}">Datenschutz</a></p>
        </div>
    </div>
</body>
</html>
    `,
    variables: ["kundenname", "geraet", "hersteller", "bewertungslink", "geschaeftsname", "adresse", "telefon", "email", "website", "aktuellesJahr", "datenschutzlink", "logo"],
    type: 'customer'
  },
  {
    name: "Reparatur erfolgreich abgeschlossen",
    subject: "Ihre Reparatur ist abholbereit",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Ihre Reparatur ist abgeschlossen!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass die Reparatur Ihres Geräts erfolgreich abgeschlossen wurde.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Reparatur:</strong> {{reparaturarbeit}}</p>
        </div>
        
        <p>Sie können Ihr Gerät zu unseren Öffnungszeiten abholen:</p>
        <p style="text-align: center; font-weight: bold;">{{oeffnungszeiten}}</p>
        
        <p>Bitte bringen Sie zum Abholen Ihren Abholschein oder einen Ausweis mit.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "reparaturarbeit", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Reparatur nicht erfolgreich",
    subject: "Information zu Ihrer Reparatur",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #f59e0b;">Reparatur leider nicht möglich</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>nach eingehender Untersuchung müssen wir Ihnen leider mitteilen, dass eine Reparatur Ihres Geräts nicht möglich ist.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{reparaturarbeit}}</p>
        </div>
        
        <p>Sie können Ihr Gerät zu unseren Öffnungszeiten abholen:</p>
        <p style="text-align: center; font-weight: bold;">{{oeffnungszeiten}}</p>
        
        <p>Bitte bringen Sie zum Abholen Ihren Abholschein oder einen Ausweis mit. Es fallen keine Reparaturkosten an.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren. Wir beraten Sie gerne zu alternativen Lösungen.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "reparaturarbeit", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Reparatur nicht akzeptiert",
    subject: "Information zu Ihrer Reparatur",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #6b7280;">Reparatur abgeschlossen</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wie besprochen, haben Sie sich entschieden, die Reparatur Ihres Geräts nicht durchführen zu lassen.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{reparaturarbeit}}</p>
        </div>
        
        <p>Sie können Ihr Gerät zu unseren Öffnungszeiten in unveränderten Zustand abholen:</p>
        <p style="text-align: center; font-weight: bold;">{{oeffnungszeiten}}</p>
        
        <p>Bitte bringen Sie zum Abholen Ihren Abholschein oder einen Ausweis mit. Es fallen nur die vereinbarten Diagnosekosten an.</p>
        
        <p>Falls Sie Fragen haben oder sich umentscheiden, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "reparaturarbeit", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Ersatzteil eingetroffen",
    subject: "Ersatzteil für Ihre Reparatur ist eingetroffen",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Gute Neuigkeiten!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass das bestellte Ersatzteil für Ihre Reparatur eingetroffen ist.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{fehler}}</p>
        </div>
        
        <p>Wir werden nun umgehend mit der Reparatur fortfahren und Sie informieren, sobald Ihr Gerät wieder abholbereit ist.</p>
        
        <p>Falls Sie Fragen haben, können Sie uns gerne kontaktieren.</p>
        
        <p>Mit freundlichen Grüßen,<br>
        Ihr Team von {{geschaeftsname}}</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "fehler", "geschaeftsname"],
    type: 'customer'
  },
  {
    name: "Zubehör eingetroffen",
    subject: "Ihr bestelltes Zubehör ist eingetroffen",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Ihr Zubehör ist da!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihr bestelltes Zubehör eingetroffen ist und zur Abholung bereitsteht.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Bestellnummer:</strong> {{bestellnummer}}</p>
          <p style="margin: 5px 0;"><strong>Artikel:</strong> {{artikel}}</p>
          <p style="margin: 5px 0;"><strong>Menge:</strong> {{menge}}</p>
          <p style="margin: 5px 0;"><strong>Gesamtpreis:</strong> {{gesamtpreis}} €</p>
          <p style="margin: 5px 0;"><strong>Anzahlung:</strong> {{anzahlung}} €</p>
          <p style="margin: 5px 0;"><strong>Noch offener Betrag:</strong> {{offener_betrag}} €</p>
        </div>
        
        <p style="font-weight: bold; color: #10b981; font-size: 16px; text-align: center; margin: 25px 0; padding: 10px; border: 2px solid #10b981; border-radius: 5px;">
          Ihr Zubehör kann jetzt abgeholt werden!
        </p>
        
        <p>Unsere Öffnungszeiten sind:</p>
        <p style="margin-left: 20px; font-weight: bold;">{{oeffnungszeiten}}</p>
        
        <p>Bitte bringen Sie zur Abholung einen gültigen Ausweis und diese E-Mail mit.</p>
        
        <p>Falls Sie Fragen haben, können Sie uns gerne kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihren Einkauf!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "bestellnummer", "artikel", "menge", "gesamtpreis", "anzahlung", "offener_betrag", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Gerät zur Reparatur bringen",
    subject: "Ersatzteile sind eingetroffen - Bitte bringen Sie Ihr Gerät vorbei",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Reparatur kann beginnen!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass alle benötigten Ersatzteile für die Reparatur Ihres Geräts nun eingetroffen sind.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{fehler}}</p>
        </div>
        
        <p style="font-weight: bold; color: #10b981; font-size: 16px; text-align: center; margin: 25px 0; padding: 10px; border: 2px solid #10b981; border-radius: 5px;">
          Bitte bringen Sie Ihr Gerät jetzt in unser Geschäft, damit wir mit der Reparatur beginnen können
        </p>
        
        <p>Unsere Öffnungszeiten sind:</p>
        <p style="margin-left: 20px;">{{oeffnungszeiten}}</p>
        
        <p>Sobald Ihr Gerät repariert ist, werden wir Sie umgehend informieren.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "fehler", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Test Email",
    subject: "Test E-Mail vom Handyshop Verwaltungssystem",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">Test E-Mail</h2>
        </div>
        
        <p>Sehr geehrte Damen und Herren,</p>
        
        <p>dies ist eine Test-E-Mail vom Handyshop Verwaltungssystem.</p>
        
        <p>Wenn Sie diese E-Mail erhalten, funktioniert die E-Mail-Konfiguration korrekt.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>System-Information:</strong></p>
          <p style="margin: 5px 0;">Zeitstempel: {{zeitstempel}}</p>
          <p style="margin: 5px 0;">Absender: {{geschaeftsname}}</p>
        </div>
        
        <p>Mit freundlichen Grüßen,<br>
        Ihr {{geschaeftsname}} Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch vom Handyshop Verwaltungssystem gesendet.</p>
        </div>
      </div>
    `,
    variables: ["zeitstempel", "geschaeftsname"],
    type: 'customer'
  },
  {
    name: "Kostenvoranschlag",
    subject: "Kostenvoranschlag für Ihre Reparatur",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb;">Kostenvoranschlag</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>gerne erstellen wir Ihnen einen Kostenvoranschlag für die Reparatur Ihres Geräts.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Problem:</strong> {{fehler}}</p>
        </div>
        
        <div style="border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0; background-color: #eff6ff;">
          <h3 style="color: #2563eb; margin-top: 0;">Geschätzte Kosten</h3>
          <p style="margin: 5px 0; font-size: 18px;"><strong>Reparaturkosten: {{kosten}}</strong></p>
          <p style="margin: 5px 0;">Arbeitszeit: {{arbeitszeit}}</p>
          <p style="margin: 5px 0;">Ersatzteile: {{ersatzteile}}</p>
        </div>
        
        <p><strong>Hinweis:</strong> Dies ist ein unverbindlicher Kostenvoranschlag. Die endgültigen Kosten können nach der detaillierten Diagnose variieren.</p>
        
        <p>Bitte teilen Sie uns mit, ob Sie mit dem Kostenvoranschlag einverstanden sind und wir mit der Reparatur fortfahren sollen.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "fehler", "kosten", "arbeitszeit", "ersatzteile", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Zubehör eingetroffen",
    subject: "Ihr bestelltes Zubehör ist eingetroffen",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Ihr Zubehör ist eingetroffen!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihr bestelltes Zubehör eingetroffen ist und zur Abholung bereitsteht.</p>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 5px 0;"><strong>Artikel:</strong> {{artikelname}}</p>
          <p style="margin: 5px 0;"><strong>Menge:</strong> {{menge}}</p>
          <p style="margin: 5px 0;"><strong>Preis:</strong> {{preis}}</p>
        </div>
        
        <p style="font-weight: bold; color: #10b981; font-size: 16px; text-align: center; margin: 25px 0; padding: 15px; border: 2px solid #10b981; border-radius: 5px; background-color: #f0fdf4;">
          Bitte holen Sie Ihr Zubehör in unserem Geschäft ab
        </p>
        
        <p>Unsere Öffnungszeiten sind:</p>
        <p style="margin-left: 20px;">{{oeffnungszeiten}}</p>
        
        <p>Bringen Sie bitte einen gültigen Lichtbildausweis zur Abholung mit.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "artikelname", "menge", "preis", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  }
];

/**
 * Erstellt die Standard-App-E-Mail-Vorlagen
 */
/**
 * Erstellt Standard-E-Mail-Vorlagen basierend auf dem übergebenen Vorlagentyp
 * @param templates Die zu erstellenden Vorlagen
 * @param type Vorlagentyp (app oder customer)
 * @param userId Für Kundenvorlagen: Die Benutzer-ID; null für systemweite Vorlagen
 * @param shopId Für Kundenvorlagen: Die Shop-ID; 0 für systemweite Vorlagen
 */
async function createEmailTemplates(
  templates: DefaultEmailTemplate[],
  type: EmailTemplateType,
  userId: number | null = null,
  shopId: number = 0
): Promise<boolean> {
  try {
    // Bei userId=null die globalen Vorlagen suchen, sonst die des Benutzers
    const whereCondition = userId === null 
      ? isNull(emailTemplates.userId)
      : eq(emailTemplates.userId, userId);
    
    // Alle relevanten Vorlagen dieses Typs filtern
    const relevantTemplates = templates.filter(template => template.type === type);
    
    // Alle existierenden Vorlagen des Benutzers abrufen
    const existingTemplates = await db.select()
      .from(emailTemplates)
      .where(whereCondition);
    
    // Vorlagen in existierende und neue aufteilen
    const existingTemplateMap = new Map();
    existingTemplates.forEach(template => {
      existingTemplateMap.set(template.name, template);
    });
    
    const now = new Date();
    
    // Alle Vorlagen durchgehen, entweder aktualisieren oder neu erstellen
    let templatesProcessed = 0;
    for (const template of relevantTemplates) {
      const existingTemplate = existingTemplateMap.get(template.name);
      
      if (existingTemplate) {
        // Vorlage aktualisieren
        await db.update(emailTemplates)
          .set({
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            type: type, // Typ der Vorlage (app oder customer)
            updatedAt: now
          })
          .where(eq(emailTemplates.id, existingTemplate.id));
        
        console.log(`E-Mail-Vorlage '${template.name}' (Typ: ${type}) wurde aktualisiert für ${userId === null ? 'System' : `Benutzer ${userId}`}`);
      } else {
        // Neue Vorlage erstellen
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          type: type, // Typ der Vorlage (app oder customer)
          userId,
          shopId,
          createdAt: now,
          updatedAt: now
        });
        
        console.log(`E-Mail-Vorlage '${template.name}' (Typ: ${type}) wurde erstellt für ${userId === null ? 'System' : `Benutzer ${userId}`}`);
      }
      templatesProcessed++;
    }
    
    console.log(`${templatesProcessed} ${type === 'app' ? 'System' : 'Kunden'}-E-Mail-Vorlagen wurden verarbeitet`);
    return templatesProcessed > 0;
  } catch (error) {
    console.error(`Fehler beim Erstellen der ${type}-E-Mail-Vorlagen:`, error);
    return false;
  }
}

/**
 * Erstellt die Standard-App-E-Mail-Vorlagen (Systemvorlagen)
 */
async function createDefaultAppEmailTemplates(): Promise<boolean> {
  return await createEmailTemplates(defaultAppEmailTemplates, 'app');
}

/**
 * Erstellt oder aktualisiert Standardvorlagen für Kundenkommunikation für einen bestimmten Benutzer
 * @param userId Benutzer-ID
 * @param shopId Shop-ID
 * @param forceUpdate Wenn true, werden alle Vorlagen aktualisiert, auch wenn sie bereits existieren
 */
async function createCustomerEmailTemplates(
  userId: number, 
  shopId: number | null = 0,
  forceUpdate: boolean = true
): Promise<boolean> {
  const shopIdNumber = typeof shopId === 'number' ? shopId : 0;
  
  try {
    const whereCondition = eq(emailTemplates.userId, userId);
    
    // Statt den statischen Templates aus dem Code, holen wir die systemweiten Vorlagen aus der DB
    // Diese wurden möglicherweise im Superadmin-Bereich bearbeitet
    const systemTemplates = await db.select()
      .from(emailTemplates)
      .where(and(
        isNull(emailTemplates.userId),
        eq(emailTemplates.shopId, 0),
        eq(emailTemplates.type, 'customer')
      ));
    
    // Wenn keine systemweiten Vorlagen existieren, fallen wir auf die Standardvorlagen zurück
    let relevantTemplates: any[] = [];
    if (systemTemplates.length > 0) {
      console.log(`${systemTemplates.length} globale Systemvorlagen gefunden, verwende diese.`);
      relevantTemplates = systemTemplates;
    } else {
      console.log(`Keine globalen Systemvorlagen gefunden, verwende Standardvorlagen aus dem Code.`);
      relevantTemplates = defaultCustomerEmailTemplates.filter(template => template.type === 'customer');
    }
    
    // Alle existierenden Vorlagen des Benutzers abrufen
    const existingTemplates = await db.select()
      .from(emailTemplates)
      .where(whereCondition);
    
    // Vorlagen in existierende und neue aufteilen
    const existingTemplateMap = new Map();
    existingTemplates.forEach(template => {
      existingTemplateMap.set(template.name, template);
    });
    
    const now = new Date();
    let templatesProcessed = 0;
    
    // Prüfen, ob "Reparatur abholbereit" vorhanden ist (oder ob archivierte "Reparatur abgeschlossen" existiert)
    const readyTemplateExists = existingTemplateMap.has("Reparatur abholbereit");
    
    // Prüfen, ob bereits eine archivierte "Reparatur abgeschlossen" Vorlage existiert
    let hasArchivedTemplate = false;
    
    // Alternative Implementierung, um TypeScript-Fehler zu vermeiden
    Object.keys(existingTemplateMap).forEach(name => {
      if (name.includes("[ARCHIVIERT]") && name.includes("Reparatur abgeschlossen")) {
        hasArchivedTemplate = true;
      }
    });
    
    // Deduplizierung: Normalisieren der Vorlagennamen für die Prüfung
    const normalizedTemplateNameMap = new Map();
    
    // Alle existierenden Vorlagen mit normalisierten Namen sammeln
    existingTemplates.forEach(template => {
      // Entferne [GLOBAL] Präfix für Vergleiche
      const normalizedName = template.name.replace(/^\[GLOBAL\]\s*/, '');
      normalizedTemplateNameMap.set(normalizedName, template);
    });
    
    // Alle Vorlagen durchgehen, entweder aktualisieren oder neu erstellen
    for (const template of relevantTemplates) {
      // Überspringe "Reparatur abgeschlossen", wenn "Reparatur abholbereit" bereits existiert
      // oder wenn bereits eine archivierte Version vorhanden ist
      if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
        console.log(`Überspringe '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
        continue;
      }
      
      // Normalisierter Vorlagenname (ohne [GLOBAL] Präfix)
      const normalizedTemplateName = template.name.replace(/^\[GLOBAL\]\s*/, '');
      
      // Überprüfen, ob wir bereits eine Vorlage mit diesem Namen haben (egal ob mit [GLOBAL] Präfix oder nicht)
      const matchingTemplate = normalizedTemplateNameMap.get(normalizedTemplateName);
      
      if (matchingTemplate) {
        // Wenn forceUpdate aktiviert ist, aktualisiere die Vorlage
        if (forceUpdate) {
          // Auch hier überprüfen, ob wir "Reparatur abgeschlossen" aktualisieren sollen
          if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
            console.log(`Überspringe Aktualisierung von '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
            continue;
          }
          
          await db.update(emailTemplates)
            .set({
              subject: template.subject,
              body: template.body,
              variables: template.variables || [],
              updatedAt: now,
              type: template.type || 'customer' // Stellen sicher, dass der Typ übernommen wird
            })
            .where(eq(emailTemplates.id, matchingTemplate.id));
          
          console.log(`E-Mail-Vorlage '${matchingTemplate.name}' wurde aktualisiert für Benutzer ${userId}`);
          templatesProcessed++;
        } else {
          console.log(`E-Mail-Vorlage '${matchingTemplate.name}' existiert bereits für Benutzer ${userId}`);
        }
      } else {
        // Überprüfen, ob "Reparatur abgeschlossen" neu erstellt werden soll
        if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
          console.log(`Überspringe Erstellung von '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
          continue;
        }
        
        // Prüfen, ob bereits eine ähnliche Vorlage existiert (mit oder ohne [GLOBAL]-Präfix)
        const existingTemplatesWithSimilarName = existingTemplates.filter(existing => {
          const normalizedExistingName = existing.name.replace(/^\[GLOBAL\]\s*/, '');
          return normalizedExistingName === normalizedTemplateName;
        });
        
        if (existingTemplatesWithSimilarName.length > 0) {
          console.log(`Vorlage '${normalizedTemplateName}' existiert bereits in einer anderen Form für Benutzer ${userId}, überspringe Erstellung.`);
          continue;
        }
        
        // Neue Vorlage erstellen
        await db.insert(emailTemplates).values({
          // Wir verwenden den Namen ohne [GLOBAL]-Präfix für den Benutzer
          name: normalizedTemplateName,
          subject: template.subject,
          body: template.body,
          variables: template.variables || [],
          userId,
          shopId: shopIdNumber,
          createdAt: now,
          updatedAt: now,
          type: template.type || 'customer'
        });
        
        console.log(`E-Mail-Vorlage '${normalizedTemplateName}' wurde erstellt für Benutzer ${userId}`);
        templatesProcessed++;
      }
    }
    
    console.log(`${templatesProcessed} Kunden-E-Mail-Vorlagen wurden verarbeitet`);
    return templatesProcessed > 0;
  } catch (error) {
    console.error('Fehler beim Erstellen/Aktualisieren der Kunden-E-Mail-Vorlagen:', error);
    return false;
  }
}

/**
 * SMTP-Konfiguration
 */
interface SMTPConfig {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
}

/**
 * Environment-Variable in die .env-Datei schreiben
 */
async function updateEnvironmentVariable(key: string, value: string): Promise<boolean> {
  try {
    // Als Superadmin-Aktion ist es legitim, diese Werte in die Umgebungsvariablen zu setzen
    // Für den Produktivbetrieb müsste eine Lösung mit einer externen Konfigurationsdatei implementiert werden
    process.env[key] = value;
    return true;
  } catch (error) {
    console.error(`Fehler beim Setzen der Umgebungsvariable ${key}:`, error);
    return false;
  }
}

/**
 * Registriert alle Routen für die E-Mail-Verwaltung im Superadmin-Bereich
 */
export function registerSuperadminEmailRoutes(app: Express) {
  /**
   * Standard-App-E-Mail-Vorlagen erstellen
   */
  app.post("/api/superadmin/email/create-default-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { type } = req.body;
      let success = false;
      let message = "";
      
      console.log(`📧 Erstelle Templates für Typ: "${type}"`);
      
      if (type === 'customer') {
        console.log(`📧 Erstelle Customer-Templates...`);
        // Erstelle die globalen Customer-Templates (mit userId=null, shopId=0)
        success = await createEmailTemplates(defaultCustomerEmailTemplates, 'customer', null, 0);
        message = success 
          ? "Standard-Kunden-E-Mail-Vorlagen wurden erfolgreich erstellt" 
          : "Fehler beim Erstellen der Standard-Kunden-E-Mail-Vorlagen";
      } else {
        console.log(`📧 Erstelle App-Templates...`);
        // Standardverhalten für App-Templates
        success = await createDefaultAppEmailTemplates();
        message = success 
          ? "Standard-App-E-Mail-Vorlagen wurden erfolgreich erstellt" 
          : "Fehler beim Erstellen der Standard-App-E-Mail-Vorlagen";
      }
      
      if (success) {
        res.status(200).json({ 
          success: true, 
          message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Fehler beim Erstellen der Standard-E-Mail-Vorlagen: ${error.message}` 
      });
    }
  });
  
  /**
   * Standard-Kundenvorlagen für einen Benutzer erstellen/wiederherstellen
   * (für reguläre Benutzer und Admins)
   */
  app.post("/api/email/restore-customer-templates", async (req: Request, res: Response) => {
    try {
      // Überprüfen, ob der Benutzer angemeldet ist
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          success: false, 
          message: "Sie müssen angemeldet sein, um diese Aktion auszuführen" 
        });
      }
      
      const userId = req.user!.id;
      const shopId = req.user!.shopId || 0; // Falls shopId null ist, verwende 0
      
      // Wichtig: Immer force=true setzen, damit die Vorlagen aus der Datenbank
      // aktualisiert werden, auch wenn sie bereits existieren
      const success = await createCustomerEmailTemplates(userId, shopId, true);
      
      if (success) {
        // Lade alle Vorlagen neu, um sie zurückzugeben
        const templates = await db.select()
          .from(emailTemplates)
          .where(eq(emailTemplates.userId, userId))
          .orderBy(desc(emailTemplates.updatedAt));
          
        res.status(201).json({ 
          success: true, 
          message: "Standard-Kundenkommunikationsvorlagen wurden erfolgreich aktualisiert",
          templates
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Keine Vorlagen aktualisiert oder erstellt. Möglicherweise gibt es ein Problem mit den Systemvorlagen." 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Fehler beim Erstellen/Aktualisieren der Standard-Kundenkommunikationsvorlagen: ${error.message}` 
      });
    }
  });
  
  /**
   * SMTP-Konfiguration abrufen
   */
  app.get("/api/superadmin/email/config", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // SMTP-Konfiguration aus der Datenbank abrufen
      const [dbConfig] = await db
        .select()
        .from(superadminEmailSettings)
        .where(eq(superadminEmailSettings.isActive, true))
        .limit(1);
      
      if (dbConfig) {
        const config: SMTPConfig = {
          smtpHost: dbConfig.smtpHost || "",
          smtpPort: dbConfig.smtpPort?.toString() || "587",
          smtpUser: dbConfig.smtpUser || "",
          smtpPassword: dbConfig.smtpPassword || "",
          smtpSenderName: dbConfig.smtpSenderName || "",
          smtpSenderEmail: dbConfig.smtpSenderEmail || ""
        };
        
        res.status(200).json(config);
      } else {
        // Fallback auf leere Konfiguration, falls keine in der DB existiert
        const config: SMTPConfig = {
          smtpHost: "",
          smtpPort: "587",
          smtpUser: "",
          smtpPassword: "",
          smtpSenderName: "",
          smtpSenderEmail: ""
        };
        
        res.status(200).json(config);
      }
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Abrufen der SMTP-Konfiguration: ${error.message}` });
    }
  });
  
  /**
   * SMTP-Konfiguration speichern/aktualisieren
   */
  app.post("/api/superadmin/email/config", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const config: SMTPConfig = req.body;
      
      // Validiere die SMTP-Konfiguration
      if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword) {
        return res.status(400).json({
          message: "Ungültige SMTP-Konfiguration. Host, Port, Benutzername und Passwort sind erforderlich."
        });
      }
      
      console.log('Speichere SMTP-Konfiguration in Datenbank:', {
        host: config.smtpHost,
        port: config.smtpPort,
        user: config.smtpUser,
        senderName: config.smtpSenderName,
        senderEmail: config.smtpSenderEmail
      });
      
      // SMTP-Einstellungs-Objekt für die Datenbank erstellen
      const settingsData = {
        smtpSenderName: config.smtpSenderName || "Handyshop Verwaltung",
        smtpSenderEmail: config.smtpSenderEmail,
        smtpHost: config.smtpHost,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
        smtpPort: typeof config.smtpPort === 'string' ? parseInt(config.smtpPort) : config.smtpPort,
        isActive: true
      };
      
      // Prüfen, ob bereits Einstellungen existieren
      const [existingSettings] = await db
        .select()
        .from(superadminEmailSettings)
        .limit(1);
      
      if (existingSettings) {
        // Aktualisieren der vorhandenen Einstellungen
        await db
          .update(superadminEmailSettings)
          .set({
            ...settingsData,
            updatedAt: new Date()
          })
          .where(eq(superadminEmailSettings.id, existingSettings.id));
        
        console.log(`SMTP-Einstellungen mit ID ${existingSettings.id} in der Datenbank aktualisiert`);
      } else {
        // Neue Einstellungen erstellen
        await db
          .insert(superadminEmailSettings)
          .values({
            ...settingsData,
            isActive: true
          });
        
        console.log('Neue SMTP-Einstellungen in der Datenbank erstellt');
      }
      
      // Aktualisiere die Einstellungen im E-Mail-Service
      console.log('Aktualisiere E-Mail-Service mit neuen Einstellungen...');
      const testSuccess = await emailService.updateSuperadminSmtpSettings(settingsData);
      
      if (!testSuccess) {
        console.warn('SMTP-Test fehlgeschlagen, aber Einstellungen wurden in der Datenbank gespeichert');
        return res.status(200).json({ 
          success: true, 
          warning: true,
          message: "SMTP-Einstellungen gespeichert, aber der SMTP-Verbindungstest ist fehlgeschlagen. Die Einstellungen sollten überprüft werden."
        });
      }
      
      res.status(200).json({ success: true, message: "SMTP-Konfiguration erfolgreich gespeichert" });
    } catch (error: any) {
      console.error('Fehler beim Speichern der SMTP-Konfiguration:', error);
      res.status(500).json({ message: `Fehler beim Speichern der SMTP-Konfiguration: ${error.message}` });
    }
  });
  
  /**
   * Test-E-Mail senden
   */
  app.post("/api/superadmin/email/test", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-Mail-Adresse ist erforderlich" });
      }
      
      // Test-E-Mail senden
      const success = await emailService.sendTestEmail(email);
      
      if (success) {
        res.status(200).json({ success: true, message: "Test-E-Mail erfolgreich gesendet" });
      } else {
        res.status(500).json({ message: "Fehler beim Senden der Test-E-Mail" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Senden der Test-E-Mail: ${error.message}` });
    }
  });

  /**
   * Alle E-Mail-Templates abrufen (nur globale Templates)
   */
  app.get("/api/superadmin/email-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      let whereCondition = and(
        isNull(emailTemplates.userId),
        eq(emailTemplates.shopId, 0)
      );
      
      // Filter nach Template-Typ wenn angegeben
      if (type && (type === 'app' || type === 'customer')) {
        whereCondition = and(
          whereCondition,
          eq(emailTemplates.type, type as string)
        );
      }
      
      const templates = await db.select()
        .from(emailTemplates)
        .where(whereCondition)
        .orderBy(emailTemplates.name);
      
      res.status(200).json(templates);
    } catch (error: any) {
      console.error("Fehler beim Abrufen der E-Mail-Templates:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der E-Mail-Templates: ${error.message}` });
    }
  });

  /**
   * E-Mail-Template erstellen (nur globale Templates)
   */
  app.post("/api/superadmin/email-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, subject, body, variables, type } = req.body;
      
      if (!name || !subject || !body) {
        return res.status(400).json({ message: "Name, Betreff und Inhalt sind erforderlich" });
      }
      
      // Prüfen ob Template mit diesem Namen bereits existiert
      const existing = await db.select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.name, name),
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0)
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ message: "Ein Template mit diesem Namen existiert bereits" });
      }
      
      const [newTemplate] = await db.insert(emailTemplates).values({
        name,
        subject,
        body,
        variables: variables || [],
        type: type || 'customer',
        userId: null, // Globales Template
        shopId: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      res.status(201).json(newTemplate);
    } catch (error: any) {
      console.error("Fehler beim Erstellen des E-Mail-Templates:", error);
      res.status(500).json({ message: `Fehler beim Erstellen des E-Mail-Templates: ${error.message}` });
    }
  });

  /**
   * E-Mail-Template aktualisieren (nur globale Templates)
   */
  app.patch("/api/superadmin/email-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, subject, body, variables, type } = req.body;
      
      if (!name || !subject || !body) {
        return res.status(400).json({ message: "Name, Betreff und Inhalt sind erforderlich" });
      }
      
      // Prüfen ob Template existiert und global ist
      const [existing] = await db.select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, parseInt(id)),
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0)
        ));
      
      if (!existing) {
        return res.status(404).json({ message: "Template nicht gefunden oder nicht global" });
      }
      
      // Prüfen ob Name bereits von anderem Template verwendet wird
      const nameConflict = await db.select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.name, name),
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0),
          sql`${emailTemplates.id} != ${parseInt(id)}`
        ));
      
      if (nameConflict.length > 0) {
        return res.status(400).json({ message: "Ein anderes Template mit diesem Namen existiert bereits" });
      }
      
      const [updatedTemplate] = await db.update(emailTemplates)
        .set({
          name,
          subject,
          body,
          variables: variables || [],
          type: type || 'customer',
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, parseInt(id)))
        .returning();
      
      res.status(200).json(updatedTemplate);
    } catch (error: any) {
      console.error("Fehler beim Aktualisieren des E-Mail-Templates:", error);
      res.status(500).json({ message: `Fehler beim Aktualisieren des E-Mail-Templates: ${error.message}` });
    }
  });

  /**
   * E-Mail-Template löschen (nur globale Templates)
   */
  app.delete("/api/superadmin/email-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Prüfen ob Template existiert und global ist
      const [existing] = await db.select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, parseInt(id)),
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0)
        ));
      
      if (!existing) {
        return res.status(404).json({ message: "Template nicht gefunden oder nicht global" });
      }
      
      // Prüfen ob Template in E-Mail-Historie verwendet wird
      const usageCheck = await db.select()
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, parseInt(id)))
        .limit(1);
      
      if (usageCheck.length > 0) {
        // Template wird verwendet, archivieren statt löschen
        await db.update(emailTemplates)
          .set({
            name: `[Archiviert] ${existing.name}`,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, parseInt(id)));
        
        res.status(200).json({ message: "Template wurde archiviert, da es bereits verwendet wurde" });
      } else {
        // Template kann sicher gelöscht werden
        await db.delete(emailTemplates)
          .where(eq(emailTemplates.id, parseInt(id)));
        
        res.status(200).json({ message: "Template erfolgreich gelöscht" });
      }
    } catch (error: any) {
      console.error("Fehler beim Löschen des E-Mail-Templates:", error);
      res.status(500).json({ message: `Fehler beim Löschen des E-Mail-Templates: ${error.message}` });
    }
  });

  /**
   * Die separate Superadmin-E-Mail-Einstellungs-Route wurde mit der SMTP-Konfigurationsroute konsolidiert
   */

  /**
   * Diese Route wird durch die SMTP-Konfigurationsroute ersetzt
   * @deprecated Verwende stattdessen /api/superadmin/email/smtp-config
   */
  app.post("/api/superadmin/email/superadmin-config", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { smtpSenderName, smtpSenderEmail, smtpHost, smtpUser, smtpPassword, smtpPort, skipTest } = req.body;
      
      // Validiere die SMTP-Konfiguration
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpSenderEmail) {
        return res.status(400).json({
          message: "Ungültige SMTP-Konfiguration. Host, Port, Benutzername, Passwort und Absender-E-Mail sind erforderlich."
        });
      }
      
      console.log('Speichere Superadmin-E-Mail-Einstellungen:', {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        sender: smtpSenderEmail
      });
      
      // SMTP-Einstellungs-Objekt erstellen
      const settingsData = {
        smtpSenderName: smtpSenderName || "Handyshop Verwaltung",
        smtpSenderEmail,
        smtpHost,
        smtpUser,
        smtpPassword,
        smtpPort: typeof smtpPort === 'string' ? parseInt(smtpPort) : smtpPort,
        isActive: true
      };
      
      try {
        // Bei den vorhandenen Einstellungen nachsehen
        let existingSettings;
        try {
          [existingSettings] = await db
            .select()
            .from(superadminEmailSettings)
            .limit(1);
        } catch (err) {
          console.error('Fehler beim Abrufen der vorhandenen Superadmin-E-Mail-Einstellungen:', err);
        }
        
        // Direkte Datenbankaktualisierung, unabhängig vom SMTP-Test
        if (existingSettings) {
          // Aktualisieren der vorhandenen Einstellungen
          await db
            .update(superadminEmailSettings)
            .set({
              ...settingsData,
              updatedAt: new Date()
            })
            .where(eq(superadminEmailSettings.id, existingSettings.id));
          
          console.log(`Superadmin-E-Mail-Einstellungen mit ID ${existingSettings.id} direkt in der Datenbank aktualisiert`);
        } else {
          // Neue Einstellungen erstellen
          await db
            .insert(superadminEmailSettings)
            .values({
              ...settingsData,
              isActive: true
            });
          
          console.log('Neue Superadmin-E-Mail-Einstellungen direkt in der Datenbank erstellt');
        }
        
        // Aktualisiere die Einstellungen im E-Mail-Service (nur wenn der Test nicht übersprungen wird)
        if (!skipTest) {
          console.log('Versuche SMTP-Verbindung zu testen...');
          const testSuccess = await emailService.updateSuperadminSmtpSettings(settingsData);
          
          if (!testSuccess) {
            console.warn('SMTP-Test fehlgeschlagen, aber Einstellungen wurden in der Datenbank gespeichert');
            return res.status(200).json({ 
              success: true, 
              warning: true,
              message: "Superadmin-E-Mail-Einstellungen gespeichert, aber der SMTP-Verbindungstest ist fehlgeschlagen. Die Einstellungen sollten überprüft werden."
            });
          }
        } else {
          // Aktualisiere das E-Mail-Service ohne Test
          emailService.loadSuperadminEmailConfig(settingsData);
        }
        
        console.log('Superadmin-E-Mail-Einstellungen erfolgreich gespeichert');
        res.status(200).json({ 
          success: true, 
          message: "Superadmin-E-Mail-Einstellungen erfolgreich gespeichert" 
        });
      } catch (dbError) {
        console.error('Fehler bei der Datenbankaktualisierung:', dbError);
        throw dbError;
      }
    } catch (error: any) {
      console.error('Allgemeiner Fehler bei Superadmin-E-Mail-Einstellungen:', error);
      res.status(500).json({ message: `Fehler beim Speichern der Superadmin-E-Mail-Einstellungen: ${error.message}` });
    }
  });

  // Test-E-Mail senden (Superadmin)
  app.post('/api/superadmin/email/test', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId || !await isSuperadmin(req, res, () => {})) {
        return res.status(403).json({ message: 'Zugriff verweigert' });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'E-Mail-Adresse ist erforderlich' });
      }

      // Prüfe ob der SMTP-Server Beschränkungen hat
      const superadminConfig = await db.select().from(superadminEmailSettings).limit(1);
      const config = superadminConfig[0];
      if (config && config.smtpHost?.includes('world4you')) {
        // Bei world4you SMTP - prüfe ob Empfänger-E-Mail-Adresse @clientking.at ist
        if (!email.endsWith('@clientking.at')) {
          return res.status(400).json({ 
            message: 'SMTP-Server-Beschränkung: Dieser SMTP-Server (world4you.com) erlaubt nur das Senden an @clientking.at Adressen. Bitte verwenden Sie eine @clientking.at E-Mail-Adresse für den Test oder konfigurieren Sie einen anderen SMTP-Server.'
          });
        }
      }

      // Verwende die Superadmin-E-Mail-Konfiguration
      await emailService.sendTestEmail(email);
      
      res.json({ 
        success: true, 
        message: 'Test-E-Mail erfolgreich gesendet' 
      });
    } catch (error) {
      console.error('Fehler beim Senden der Test-E-Mail:', error);
      res.status(500).json({ 
        message: 'Fehler beim Senden der Test-E-Mail',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  });
  
  /**
   * Test-E-Mail mit einer bestimmten Vorlage senden
   */
  app.post("/api/superadmin/email/template-test", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { templateId, testEmail } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ message: "Vorlagen-ID ist erforderlich" });
      }
      
      if (!testEmail) {
        return res.status(400).json({ message: "Test-E-Mail-Adresse ist erforderlich" });
      }
      
      // Vorlage aus der Datenbank abrufen
      const [template] = await db.select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Vorlage nicht gefunden" });
      }
      
      // Beispieldaten für die Variablen zusammenstellen
      const testData: Record<string, string> = {};
      
      // Für jede Variable in der Vorlage einen Beispielwert setzen
      if (template.variables && template.variables.length > 0) {
        for (const variable of template.variables) {
          // Standard-Beispielwerte für häufig verwendete Variablen
          switch (variable) {
            case 'kundenname':
              testData[variable] = 'Max Mustermann';
              break;
            case 'geraet':
              testData[variable] = 'iPhone 13';
              break;
            case 'hersteller':
              testData[variable] = 'Apple';
              break;
            case 'auftragsnummer':
              testData[variable] = 'R-2025-123456';
              break;
            case 'fehler':
              testData[variable] = 'Displayschaden';
              break;
            case 'reparaturarbeit':
              testData[variable] = 'Display-Austausch';
              break;
            case 'oeffnungszeiten':
              testData[variable] = 'Mo-Fr: 9:00 - 18:00, Sa: 10:00 - 14:00';
              break;
            case 'geschaeftsname':
              testData[variable] = 'Handy Reparatur Shop';
              break;
            case 'adresse':
              testData[variable] = 'Musterstraße 123, 1234 Musterstadt';
              break;
            case 'telefon':
              testData[variable] = '+43 123 456 789';
              break;
            case 'email':
              testData[variable] = 'info@example.com';
              break;
            case 'website':
              testData[variable] = 'www.example.com';
              break;
            case 'bewertungslink':
              testData[variable] = 'https://www.example.com/bewertung';
              break;
            case 'aktuellesJahr':
              testData[variable] = new Date().getFullYear().toString();
              break;
            case 'datenschutzlink':
              testData[variable] = 'https://www.example.com/datenschutz';
              break;
            case 'logo':
              testData[variable] = 'https://www.example.com/logo.png';
              break;
            case 'benutzername':
              testData[variable] = 'max.mustermann';
              break;
            case 'loginLink':
              testData[variable] = 'https://www.example.com/login';
              break;
            case 'resetLink':
              testData[variable] = 'https://www.example.com/reset-password?token=example';
              break;
            default:
              // Für unbekannte Variablen einen generischen Beispielwert
              testData[variable] = `<${variable}>`;
          }
        }
      }
      
      // E-Mail mit Testdaten senden
      const success = await emailService.sendEmailWithTemplate({
        templateName: template.name,
        recipientEmail: testEmail,
        data: testData,
        subject: template.subject,
        body: template.body
      });
      
      if (success) {
        res.status(200).json({ 
          success: true, 
          message: "Test-E-Mail mit Vorlage erfolgreich gesendet",
          testData: testData 
        });
      } else {
        res.status(500).json({ message: "Fehler beim Senden der Test-E-Mail mit Vorlage" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Senden der Test-E-Mail mit Vorlage: ${error.message}` });
    }
  });
  
  /**
   * Alle E-Mail-Vorlagen abrufen (systemweit)
   */
  app.get("/api/superadmin/email/templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const typeFilter = req.query.type as string | undefined;
      
      // Nur globale Vorlagen (userId = null, shopId = 0) plus Typ-Filter
      let queryBuilder = db
        .select()
        .from(emailTemplates)
        .where(and(
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0)
        ));
      
      // Filter-Optionen
      if (typeFilter) {
        // Nach Typ filtern (app oder customer)
        queryBuilder = db
          .select()
          .from(emailTemplates)
          .where(and(
            isNull(emailTemplates.userId),
            eq(emailTemplates.shopId, 0),
            eq(emailTemplates.type, typeFilter)
          ));
      }
      
      // Sortieren nach Update-Datum (neueste zuerst)
      const templates = await queryBuilder.orderBy(desc(emailTemplates.updatedAt));
      
      res.status(200).json(templates);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Abrufen der E-Mail-Vorlagen: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage erstellen
   */
  app.post("/api/superadmin/email/templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const templateData = req.body;
      
      // Validiere die Vorlagendaten
      if (!templateData.name || !templateData.subject || !templateData.body) {
        return res.status(400).json({
          message: "Ungültige Vorlagendaten. Name, Betreff und Inhalt sind erforderlich."
        });
      }
      
      // Prüfe, ob eine Vorlage mit diesem Namen bereits existiert
      const existingTemplates = await db.select()
        .from(emailTemplates)
        .where(and(
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0),
          eq(emailTemplates.name, templateData.name)
        ));
      
      if (existingTemplates.length > 0) {
        return res.status(400).json({
          message: `Eine Vorlage mit dem Namen '${templateData.name}' existiert bereits im System. Bitte wählen Sie einen anderen Namen.`
        });
      }
      
      // Erstelle die Vorlage für systemweite Nutzung (userId = null, shopId = 0)
      const newTemplate: InsertEmailTemplate = {
        name: templateData.name,
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
        userId: null, // Globale Vorlage
        shopId: 0, // Systemweit verfügbar
        type: templateData.type || 'customer' // Standard-Typ ist 'customer', kann aber überschrieben werden
      };
      
      const [createdTemplate] = await db
        .insert(emailTemplates)
        .values(newTemplate)
        .returning();
      
      res.status(201).json(createdTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Erstellen der E-Mail-Vorlage: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage aktualisieren
   */
  app.patch("/api/superadmin/email/templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = req.body;
      
      // Validiere die ID
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Vorlagen-ID" });
      }
      
      // Prüfe, ob die Vorlage existiert
      const [existingTemplate] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "E-Mail-Vorlage nicht gefunden" });
      }
      
      // Aktualisiere die Vorlage
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set({
          name: templateData.name || existingTemplate.name,
          subject: templateData.subject || existingTemplate.subject,
          body: templateData.body || existingTemplate.body,
          variables: templateData.variables || existingTemplate.variables,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, id))
        .returning();
      
      // Besondere Behandlung für System-Vorlagen vom Typ 'customer'
      // Wenn ein Superadmin eine globale Kunden-Vorlage aktualisiert, sorgen wir für Synchronisierung
      if (existingTemplate.type === 'customer' && existingTemplate.userId === null && existingTemplate.shopId === 0) {
        console.log(`Globale Kunden-Vorlage "${updatedTemplate.name}" wurde aktualisiert.`);
      }
      
      res.status(200).json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Aktualisieren der E-Mail-Vorlage: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage löschen
   */
  app.delete("/api/superadmin/email/templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validiere die ID
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Vorlagen-ID" });
      }
      
      // Prüfe, ob die Vorlage existiert
      const [existingTemplate] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "E-Mail-Vorlage nicht gefunden" });
      }
      
      // Prüfen, ob die Vorlage in der E-Mail-Historie verwendet wird
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, id)) as [{ count: number }];
      
      const usageCount = Number(count);
      
      if (usageCount > 0) {
        // Statt die Vorlage zu löschen, können wir den Inhalt mit einem Vermerk überschreiben
        // und optional einen "gelöscht"-Flag setzen
        const archiveName = `[ARCHIVIERT] ${existingTemplate.name}`;
        const archiveNote = `<p><strong>Diese Vorlage wurde archiviert, da sie nicht gelöscht werden kann.</strong></p>
<p>Sie wird von ${usageCount} E-Mail(s) in der Historie verwendet.</p>
<p>Originaler Inhalt:</p>
${existingTemplate.body}`;

        await db
          .update(emailTemplates)
          .set({ 
            name: archiveName,
            body: archiveNote,
            type: 'archived' // Spezielle Markierung für archivierte Vorlagen
          })
          .where(eq(emailTemplates.id, id));
        
        return res.status(200).json({ 
          message: `Die E-Mail-Vorlage wurde archiviert, da sie in ${usageCount} E-Mails verwendet wird und nicht gelöscht werden kann.`,
          archived: true
        });
      }
      
      // Lösche die Vorlage, wenn sie nicht verwendet wird
      await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Löschen der E-Mail-Vorlage: ${error.message}` });
    }
  });

  // =====================================================
  // NEWSLETTER SYSTEM - Superadmin Newsletter Management
  // =====================================================

  /**
   * Alle Newsletter abrufen
   */
  app.get("/api/superadmin/newsletters", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allNewsletters = await db
        .select({
          id: newsletters.id,
          title: newsletters.title,
          subject: newsletters.subject,
          content: newsletters.content,
          status: newsletters.status,
          totalRecipients: newsletters.totalRecipients,
          successfulSends: newsletters.successfulSends,
          failedSends: newsletters.failedSends,
          createdAt: newsletters.createdAt,
          sentAt: newsletters.sentAt,
          createdByUsername: users.username,
          createdByEmail: users.email
        })
        .from(newsletters)
        .leftJoin(users, eq(newsletters.createdBy, users.id))
        .orderBy(desc(newsletters.createdAt));

      res.json(allNewsletters);
    } catch (error: any) {
      console.error("Fehler beim Abrufen der Newsletter:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Newsletter: ${error.message}` });
    }
  });

  /**
   * Newsletter erstellen
   */
  /**
   * Newsletter-Logo-Upload URL abrufen
   */
  app.post("/api/superadmin/newsletters/logo-upload", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getNewsletterLogoUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Fehler beim Abrufen der Logo-Upload-URL:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Logo-Upload-URL: ${error.message}` });
    }
  });

  /**
   * Newsletter Logo abrufen
   */
  app.get("/newsletter-logos/:filePath(*)", async (req: Request, res: Response) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(`newsletter-logos/${filePath}`);
      if (!file) {
        return res.status(404).json({ error: "Logo nicht gefunden" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Fehler beim Laden des Newsletter-Logos:", error);
      return res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  /**
   * Newsletter Logo Management APIs
   */

  // Upload URL für neues Logo abrufen
  app.post("/api/superadmin/newsletter-logos/upload", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getNewsletterLogoUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Fehler beim Abrufen der Logo-Upload-URL:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Logo-Upload-URL: ${error.message}` });
    }
  });

  // Alle Newsletter-Logos abrufen
  app.get("/api/superadmin/newsletter-logos", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const logos = await db
        .select()
        .from(newsletterLogos)
        .orderBy(desc(newsletterLogos.createdAt));

      res.json(logos);
    } catch (error: any) {
      console.error("Fehler beim Abrufen der Newsletter-Logos:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Newsletter-Logos: ${error.message}` });
    }
  });

  // Logo nach Upload registrieren
  app.post("/api/superadmin/newsletter-logos", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, filename, filepath } = req.body;
      const superadminUserId = (req as any).user?.id;

      if (!name || !filename || !filepath) {
        return res.status(400).json({ message: "Name, Dateiname und Dateipfad sind erforderlich" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeNewsletterLogoPath(filepath);

      const newLogo: InsertNewsletterLogo = {
        name,
        filename,
        filepath: normalizedPath,
        isActive: false,
        createdBy: superadminUserId,
      };

      const [createdLogo] = await db
        .insert(newsletterLogos)
        .values(newLogo)
        .returning();

      res.status(201).json(createdLogo);
    } catch (error: any) {
      console.error("Fehler beim Registrieren des Logos:", error);
      res.status(500).json({ message: `Fehler beim Registrieren des Logos: ${error.message}` });
    }
  });

  // Logo aktivieren (alle anderen deaktivieren)
  app.patch("/api/superadmin/newsletter-logos/:id/activate", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const logoId = parseInt(req.params.id);

      // Alle Logos deaktivieren
      await db
        .update(newsletterLogos)
        .set({ isActive: false, updatedAt: new Date() });

      // Gewähltes Logo aktivieren
      const [activatedLogo] = await db
        .update(newsletterLogos)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(newsletterLogos.id, logoId))
        .returning();

      if (!activatedLogo) {
        return res.status(404).json({ message: "Logo nicht gefunden" });
      }

      res.json(activatedLogo);
    } catch (error: any) {
      console.error("Fehler beim Aktivieren des Logos:", error);
      res.status(500).json({ message: `Fehler beim Aktivieren des Logos: ${error.message}` });
    }
  });

  // Logo löschen
  app.delete("/api/superadmin/newsletter-logos/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const logoId = parseInt(req.params.id);

      // Logo aus Datenbank löschen
      const [deletedLogo] = await db
        .delete(newsletterLogos)
        .where(eq(newsletterLogos.id, logoId))
        .returning();

      if (!deletedLogo) {
        return res.status(404).json({ message: "Logo nicht gefunden" });
      }

      // TODO: Logo-Datei aus Object Storage löschen (optional)
      
      res.json({ message: "Logo erfolgreich gelöscht" });
    } catch (error: any) {
      console.error("Fehler beim Löschen des Logos:", error);
      res.status(500).json({ message: `Fehler beim Löschen des Logos: ${error.message}` });
    }
  });

  // Aktives Logo abrufen
  app.get("/api/superadmin/newsletter-logos/active", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const [activeLogo] = await db
        .select()
        .from(newsletterLogos)
        .where(eq(newsletterLogos.isActive, true))
        .limit(1);

      if (!activeLogo) {
        return res.json(null);
      }

      res.json(activeLogo);
    } catch (error: any) {
      console.error("Fehler beim Abrufen des aktiven Logos:", error);
      res.status(500).json({ message: `Fehler beim Abrufen des aktiven Logos: ${error.message}` });
    }
  });

  app.post("/api/superadmin/newsletters", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { title, subject, content, logoNewsletter } = req.body;
      const superadminUserId = (req as any).user?.id;

      if (!title || !subject || !content) {
        return res.status(400).json({ message: "Titel, Betreff und Inhalt sind erforderlich" });
      }

      // Logo-Pfad normalisieren falls vorhanden
      let normalizedLogoPath = null;
      if (logoNewsletter) {
        const objectStorageService = new ObjectStorageService();
        normalizedLogoPath = objectStorageService.normalizeNewsletterLogoPath(logoNewsletter);
      }

      const newNewsletter: InsertNewsletter = {
        title,
        subject,
        content,
        logoNewsletter: normalizedLogoPath,
        createdBy: superadminUserId,
        status: 'draft'
      };

      const [createdNewsletter] = await db
        .insert(newsletters)
        .values(newNewsletter)
        .returning();

      res.status(201).json(createdNewsletter);
    } catch (error: any) {
      console.error("Fehler beim Erstellen des Newsletters:", error);
      res.status(500).json({ message: `Fehler beim Erstellen des Newsletters: ${error.message}` });
    }
  });

  /**
   * Newsletter versenden
   */
  app.post("/api/superadmin/newsletters/:id/send", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const newsletterId = parseInt(req.params.id);
      
      if (isNaN(newsletterId)) {
        return res.status(400).json({ message: "Ungültige Newsletter-ID" });
      }

      // Newsletter abrufen
      const [newsletter] = await db
        .select()
        .from(newsletters)
        .where(eq(newsletters.id, newsletterId));

      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter nicht gefunden" });
      }

      // Newsletter kann mehrfach versendet werden - Sperre entfernt
      console.log(`📧 Newsletter "${newsletter.title}" wird ${newsletter.status === 'sent' ? 'erneut' : ''} versendet`);

      // Alle berechtigten und abonnierten Benutzer abrufen (nur Owner und Multi-Shop-Admins)
      const recipients = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: businessSettings.ownerFirstName,
          lastName: businessSettings.ownerLastName,
          companyName: businessSettings.businessName
        })
        .from(users)
        .leftJoin(businessSettings, eq(users.id, businessSettings.userId))
        .where(
          and(
            eq(users.isActive, true),
            eq(users.newsletterSubscribed, true),
            or(
              eq(users.role, 'owner'),
              eq(users.isMultiShopAdmin, true)
            )
          )
        );

      console.log(`📧 Versende Newsletter "${newsletter.title}" an ${recipients.length} Empfänger`);
      console.log(`🚨 LOGO-DEBUG: Starte Logo-Integration für Newsletter ${newsletter.id}`);

      // Vorbereitung der Empfänger-Liste für das EmailService
      const emailRecipients = recipients.map(recipient => ({
        email: recipient.email,
        name: recipient.firstName && recipient.lastName 
          ? `${recipient.firstName} ${recipient.lastName}` 
          : recipient.companyName || 'Geschätzte/r Kunde/in'
      }));

      // Newsletter-Send-Einträge für alle Empfänger erstellen
      const newsletterSendData = recipients.map(recipient => ({
        newsletterId: newsletter.id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        status: 'pending' as const
      }));

      await db.insert(newsletterSends).values(newsletterSendData);

      // Logo-URL direkt in den Newsletter-Content einbauen (Workaround für Variable-Problem)
      let newsletterContent = newsletter.content;
      try {
        const [activeLogo] = await db
          .select()
          .from(newsletterLogos)
          .where(eq(newsletterLogos.isActive, true))
          .limit(1);
        
        if (activeLogo) {
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
          const logoFileName = activeLogo.filepath.split('/').pop();
          const logoUrl = `${baseUrl}/public-objects/newsletter-logos/${logoFileName}`;
          const logoHtml = `<img src="${logoUrl}" alt="${activeLogo.name}" style="max-height: 200px; max-width: 100%; height: auto;" />`;
          
          // Ersetze {{logoNewsletter}} direkt
          newsletterContent = newsletterContent.replace(/\{\{logoNewsletter\}\}/g, logoHtml);
          console.log(`📸 Logo direkt ersetzt: ${activeLogo.name} - ${logoUrl}`);
        }
      } catch (error) {
        console.warn('Fehler beim Laden des Newsletter-Logos:', error);
      }

      // Newsletter mit professioneller HTML-Vorlage und ClientKing Logo versenden
      const sendResult = await emailService.sendNewsletter(
        {
          subject: newsletter.subject,
          content: newsletterContent
        },
        emailRecipients
      );

      console.log(`📊 Newsletter-Versand Ergebnis: ${sendResult.sentCount} erfolgreich, ${sendResult.failedCount} fehlgeschlagen`);

      // Newsletter-Send-Status in der Datenbank aktualisieren
      for (const detail of sendResult.details) {
        const recipient = recipients.find(r => r.email === detail.email);
        if (recipient) {
          await db
            .update(newsletterSends)
            .set({
              status: detail.status === 'sent' ? 'sent' : 'failed',
              sentAt: detail.status === 'sent' ? new Date() : undefined,
              errorMessage: detail.error || undefined
            })
            .where(
              and(
                eq(newsletterSends.newsletterId, newsletter.id),
                eq(newsletterSends.recipientId, recipient.id)
              )
            );
        }
      }

      const successCount = sendResult.sentCount;
      const failCount = sendResult.failedCount;

      // Newsletter-Status und Statistiken aktualisieren
      await db
        .update(newsletters)
        .set({
          status: 'sent',
          sentAt: new Date(),
          totalRecipients: recipients.length,
          successfulSends: successCount,
          failedSends: failCount
        })
        .where(eq(newsletters.id, newsletter.id));

      res.json({
        message: `Newsletter erfolgreich versendet`,
        totalRecipients: recipients.length,
        successfulSends: successCount,
        failedSends: failCount
      });

    } catch (error: any) {
      console.error("Fehler beim Versenden des Newsletters:", error);
      res.status(500).json({ message: `Fehler beim Versenden des Newsletters: ${error.message}` });
    }
  });

  /**
   * Newsletter löschen
   */
  app.delete("/api/superadmin/newsletters/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const newsletterId = parseInt(req.params.id);
      
      if (isNaN(newsletterId)) {
        return res.status(400).json({ message: "Ungültige Newsletter-ID" });
      }

      // Prüfen ob Newsletter existiert
      const [newsletter] = await db
        .select()
        .from(newsletters)
        .where(eq(newsletters.id, newsletterId));

      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter nicht gefunden" });
      }

      // Newsletter und zugehörige Sends löschen
      await db.delete(newsletterSends).where(eq(newsletterSends.newsletterId, newsletterId));
      await db.delete(newsletters).where(eq(newsletters.id, newsletterId));

      res.status(204).send();
    } catch (error: any) {
      console.error("Fehler beim Löschen des Newsletters:", error);
      res.status(500).json({ message: `Fehler beim Löschen des Newsletters: ${error.message}` });
    }
  });

  /**
   * Newsletter-Abonnement für User aktualisieren (Superadmin-Bereich)
   */
  app.patch("/api/superadmin/users/:userId/newsletter-subscription", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { newsletterSubscribed } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      if (typeof newsletterSubscribed !== 'boolean') {
        return res.status(400).json({ message: "newsletterSubscribed muss ein Boolean sein" });
      }

      // Benutzer abrufen und prüfen ob er Newsletter abonnieren darf (nur Owner/Multi-Shop-Admins)
      const [user] = await db
        .select({
          id: users.id,
          role: users.role,
          isMultiShopAdmin: users.isMultiShopAdmin,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Prüfen ob Benutzer berechtigt ist Newsletter zu abonnieren
      const isEligible = user.role === 'owner' || user.isMultiShopAdmin;
      
      if (!isEligible && newsletterSubscribed) {
        return res.status(403).json({ 
          message: "Nur Shop-Owner und Multi-Shop-Admins können Newsletter abonnieren" 
        });
      }

      // Newsletter-Status aktualisieren
      await db
        .update(users)
        .set({ newsletterSubscribed })
        .where(eq(users.id, userId));

      console.log(`📧 Superadmin hat Newsletter-Abonnement für Benutzer ${user.email} (ID: ${userId}) ${newsletterSubscribed ? 'aktiviert' : 'deaktiviert'}`);

      res.json({ 
        message: `Newsletter-Abonnement ${newsletterSubscribed ? 'aktiviert' : 'deaktiviert'}`,
        newsletterSubscribed 
      });

    } catch (error: any) {
      console.error("Fehler beim Ändern des Newsletter-Abonnements:", error);
      res.status(500).json({ message: `Fehler beim Ändern des Newsletter-Abonnements: ${error.message}` });
    }
  });

  /**
   * Newsletter-Statistiken für Dashboard
   */
  app.get("/api/superadmin/newsletters/stats", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Gesamtanzahl Newsletter
      const [{ totalNewsletters }] = await db
        .select({ totalNewsletters: sql`count(*)` })
        .from(newsletters) as [{ totalNewsletters: number }];

      // Anzahl versendete Newsletter
      const [{ sentNewsletters }] = await db
        .select({ sentNewsletters: sql`count(*)` })
        .from(newsletters)
        .where(eq(newsletters.status, 'sent')) as [{ sentNewsletters: number }];

      // Anzahl abonnierte Benutzer (Owner + Multi-Shop-Admins)
      const [{ subscribedUsers }] = await db
        .select({ subscribedUsers: sql`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            eq(users.newsletterSubscribed, true),
            or(
              eq(users.role, 'owner'),
              eq(users.isMultiShopAdmin, true)
            )
          )
        ) as [{ subscribedUsers: number }];

      // Letzte 5 versendete Newsletter
      const recentNewsletters = await db
        .select({
          id: newsletters.id,
          title: newsletters.title,
          sentAt: newsletters.sentAt,
          totalRecipients: newsletters.totalRecipients,
          successfulSends: newsletters.successfulSends
        })
        .from(newsletters)
        .where(eq(newsletters.status, 'sent'))
        .orderBy(desc(newsletters.sentAt))
        .limit(5);

      res.json({
        totalNewsletters: Number(totalNewsletters),
        sentNewsletters: Number(sentNewsletters),
        subscribedUsers: Number(subscribedUsers),
        recentNewsletters
      });

    } catch (error: any) {
      console.error("Fehler beim Abrufen der Newsletter-Statistiken:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Newsletter-Statistiken: ${error.message}` });
    }
  });

  /**
   * Newsletter-Versand-Historie abrufen (aggregiert)
   */
  app.get("/api/superadmin/newsletters/send-history", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Aggregierte Historie: Gruppiert nach Newsletter mit Empfänger-Anzahl
      const aggregatedHistory = await db
        .select({
          newsletterId: newsletters.id,
          title: newsletters.title,
          subject: newsletters.subject,
          recipientCount: sql<number>`COUNT(${newsletterSends.id})`,
          lastSentAt: sql<string>`MAX(${newsletterSends.sentAt})`,
          successfulSends: sql<number>`COUNT(CASE WHEN ${newsletterSends.status} = 'sent' THEN 1 END)`,
          failedSends: sql<number>`COUNT(CASE WHEN ${newsletterSends.status} = 'failed' THEN 1 END)`,
        })
        .from(newsletters)
        .innerJoin(newsletterSends, eq(newsletters.id, newsletterSends.newsletterId))
        .groupBy(newsletters.id, newsletters.title, newsletters.subject)
        .orderBy(sql`MAX(${newsletterSends.sentAt}) DESC`)
        .limit(50);

      res.json(aggregatedHistory);

    } catch (error: any) {
      console.error("Fehler beim Abrufen der Newsletter-Versand-Historie:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Newsletter-Versand-Historie: ${error.message}` });
    }
  });

  /**
   * Detaillierte Empfänger-Liste für einen Newsletter abrufen (mit Shop-Namen)
   */
  app.get("/api/superadmin/newsletters/:id/recipients", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const newsletterId = parseInt(req.params.id);
      
      // Alle Newsletter-Empfänger abrufen
      const allRecipients = await db
        .select({
          id: newsletterSends.id,
          recipientEmail: newsletterSends.recipientEmail,
          status: newsletterSends.status,
          sentAt: newsletterSends.sentAt,
        })
        .from(newsletterSends)
        .where(eq(newsletterSends.newsletterId, newsletterId))
        .orderBy(desc(newsletterSends.sentAt));

      // Shop-Namen nachschlagen für E-Mail-Adressen die in der Users-Tabelle sind
      const recipientsWithShops = await Promise.all(
        allRecipients.map(async (recipient) => {
          const userWithShop = await db
            .select({
              shopName: businessSettings.businessName,
              shopId: users.shopId,
            })
            .from(users)
            .leftJoin(businessSettings, eq(users.shopId, businessSettings.shopId))
            .where(eq(users.email, recipient.recipientEmail))
            .limit(1);

          return {
            ...recipient,
            shopName: userWithShop[0]?.shopName || null,
            shopId: userWithShop[0]?.shopId || null,
          };
        })
      );

      const recipients = recipientsWithShops;

      res.json(recipients);

    } catch (error: any) {
      console.error("Fehler beim Abrufen der Newsletter-Empfänger:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Newsletter-Empfänger: ${error.message}` });
    }
  });

  /**
   * Gesamtzahl aller Shops für Reichweiten-Statistiken
   */
  app.get("/api/superadmin/shops/total-count", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const result = await db
        .select({ totalShops: sql<number>`COUNT(DISTINCT ${businessSettings.shopId})` })
        .from(businessSettings)
        .where(sql`${businessSettings.shopId} IS NOT NULL`);

      res.json({ totalShops: result[0]?.totalShops || 0 });

    } catch (error: any) {
      console.error("Fehler beim Abrufen der Gesamtzahl der Shops:", error);
      res.status(500).json({ message: `Fehler beim Abrufen der Gesamtzahl der Shops: ${error.message}` });
    }
  });
}

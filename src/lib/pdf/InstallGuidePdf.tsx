import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 48,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111",
    lineHeight: 1.4,
  },
  cover: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "#111",
    paddingBottom: 10,
  },
  logo: {
    width: 64,
    height: 64,
    marginRight: 14,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    marginRight: 14,
  },
  coverHeader: {
    flexDirection: "column",
    flexGrow: 1,
  },
  companyName: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
  },
  companyMail: {
    fontSize: 9,
    fontWeight: 700,
    marginTop: 1,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 36,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    color: "#333",
  },
  coverVersion: {
    fontSize: 11,
    textAlign: "center",
    color: "#555",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#111",
  },
  paragraph: {
    marginBottom: 6,
    fontSize: 10.5,
  },
  numberedItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  numberedBullet: {
    width: 18,
    fontSize: 10.5,
    fontWeight: 700,
  },
  numberedBody: {
    flex: 1,
    fontSize: 10.5,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f3f3f3",
    padding: 6,
    marginVertical: 4,
  },
  table: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#111",
    marginTop: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eaeaea",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#111",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#ccc",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9.5,
  },
  tableColSymptom: { width: "30%" },
  tableColCause: { width: "30%" },
  tableColFix: { width: "40%" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#ccc",
    paddingTop: 4,
  },
});

type Props = { logoSrc: string | null };

function PageFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <Text style={styles.footer} fixed>
      {COMPANY.name} · Guía de Instalación LAN v0.2.0 · Página {pageNumber}
    </Text>
  );
}

function NumberedItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={styles.numberedItem} wrap={false}>
      <Text style={styles.numberedBullet}>{n}.</Text>
      <Text style={styles.numberedBody}>{children}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function InstallGuidePdf({ logoSrc }: Props) {
  return (
    <Document
      title="Guía de Instalación LAN — MetalFlow ERP v0.2.0"
      author={COMPANY.name}
      subject="Cómo instalar Metalu en una red local de taller"
    >
      {/* === COVER === */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover} fixed>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder} />
          )}
          <View style={styles.coverHeader}>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyLine}>RUT {COMPANY.rut}</Text>
            <Text style={styles.companyLine}>
              {COMPANY.address}, {COMPANY.neighborhood}
            </Text>
            <Text style={styles.companyLine}>{COMPANY.city}</Text>
            <Text style={styles.companyLine}>Tel: {COMPANY.phone}</Text>
            <Text style={styles.companyMail}>MAIL: {COMPANY.email}</Text>
          </View>
        </View>

        <Text style={styles.coverTitle}>Guía de Instalación LAN</Text>
        <Text style={styles.coverSubtitle}>MetalFlow ERP — Distribución para taller</Text>
        <Text style={styles.coverVersion}>Versión 0.2.0 · Windows x64</Text>

        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.paragraph}>
          Este documento explica cómo instalar MetalFlow ERP en una red local (LAN) de un
          taller. Una PC actúa como servidor (base de datos + Next.js + anuncios UDP).
          Entre 2 y 5 PCs cliente descubren el servidor automáticamente mediante UDP y
          abren la aplicación dentro del shell Tauri.
        </Text>

        <Text style={styles.sectionTitle}>Resumen rápido</Text>
        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 700 }}>Servidor: </Text>
          copie <Text style={{ fontFamily: "Courier" }}>metalu-server.exe</Text> a la PC
          servidor, haga doble clic. La aplicación queda escuchando en el puerto 3000 y
          anunciando su IP por UDP cada 5 segundos.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 700 }}>Clientes: </Text>
          copie <Text style={{ fontFamily: "Courier" }}>metalu-client.exe</Text> a cada PC
          cliente, doble clic. La ventana descubre el servidor en menos de 30 segundos.
        </Text>

        <PageFooter pageNumber={1} />
      </Page>

      {/* === CONTENT === */}
      <Page size="A4" style={styles.page}>
        <SectionTitle>Requisitos</SectionTitle>
        <NumberedItem n={1}>Windows 10 u 11 x64 en todas las PCs.</NumberedItem>
        <NumberedItem n={2}>
          Todas las PCs deben estar en la misma red local (router, switch o WiFi).
        </NumberedItem>
        <NumberedItem n={3}>
          WebView2 Runtime instalado (ya viene con Windows 11; el instalador del cliente
          lo descarga automáticamente en Windows 10).
        </NumberedItem>
        <NumberedItem n={4}>
          Puerto UDP 3001 desbloqueado en el firewall de la PC servidor (Windows lo
          solicita la primera vez).
        </NumberedItem>
        <NumberedItem n={5}>
          Al menos 500 MB libres en disco para la base de datos PGlite y los backups.
        </NumberedItem>

        <SectionTitle>Instalación — PC Servidor</SectionTitle>
        <NumberedItem n={1}>
          Copie <Text style={{ fontFamily: "Courier" }}>metalu-server.exe</Text> a una
          carpeta de la PC servidor, por ejemplo <Text style={{ fontFamily: "Courier" }}>C:\metalu\</Text>.
        </NumberedItem>
        <NumberedItem n={2}>
          Haga doble clic en el archivo. Aparecerá una ventana de consola mostrando:
        </NumberedItem>
        <View style={styles.code}>
          <Text>[server] data dir: C:\Users\&lt;usuario&gt;\AppData\Roaming\metalu</Text>
          <Text>[server] Next.js escuchando en http://0.0.0.0:3000</Text>
          <Text>[server] Anunciante UDP transmitiendo en :3001 cada 5000ms</Text>
        </View>
        <NumberedItem n={3}>
          Abra <Text style={{ fontFamily: "Courier" }}>http://localhost:3000</Text>{" "}
          en cualquier navegador de la PC servidor.
        </NumberedItem>
        <NumberedItem n={4}>
          Inicie sesión con <Text style={{ fontFamily: "Courier" }}>admin / admin</Text>{" "}
          (usuario por defecto de primer inicio). Cámbielo inmediatamente en{" "}
          <Text style={{ fontWeight: 700 }}>Configuración → Usuarios</Text>.
        </NumberedItem>
        <NumberedItem n={5}>
          Anote la IP que aparece en{" "}
          <Text style={{ fontFamily: "Courier" }}>/admin/server-info</Text> (por ejemplo{" "}
          <Text style={{ fontFamily: "Courier" }}>192.168.1.5</Text>).
        </NumberedItem>

        <SectionTitle>Instalación — PCs Cliente</SectionTitle>
        <NumberedItem n={1}>
          Copie <Text style={{ fontFamily: "Courier" }}>metalu-client.exe</Text> a cada
          PC cliente (por ejemplo al Escritorio).
        </NumberedItem>
        <NumberedItem n={2}>
          Haga doble clic. Se abre una ventana con la pantalla de inicio de sesión.
        </NumberedItem>
        <NumberedItem n={3}>
          El primer inicio descubre el servidor vía UDP en menos de 30 segundos.
        </NumberedItem>
        <NumberedItem n={4}>
          Los inicios siguientes reutilizan la URL guardada en caché durante 30 días.
        </NumberedItem>
        <NumberedItem n={5}>
          Si la pantalla muestra “No se encontró servidor”, verifique que la PC servidor
          esté encendida y que ambas PCs estén en el mismo router.
        </NumberedItem>

        <PageFooter pageNumber={2} />
      </Page>

      {/* === BACKUP === */}
      <Page size="A4" style={styles.page}>
        <SectionTitle>Copias de seguridad y restauración</SectionTitle>
        <Text style={styles.paragraph}>
          Desde el panel de administración del servidor:{" "}
          <Text style={{ fontFamily: "Courier" }}>http://&lt;ip-servidor&gt;:3000/admin/backups</Text>
        </Text>

        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 700 }}>Hacer backup ahora: </Text>
          genera un archivo{" "}
          <Text style={{ fontFamily: "Courier" }}>metalu-YYYY-MM-DD.pglitebackup</Text> en
          la carpeta{" "}
          <Text style={{ fontFamily: "Courier" }}>%APPDATA%\metalu\backups\</Text>. Se
          conservan los últimos 10; los más antiguos se eliminan automáticamente.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 700 }}>Descargar: </Text>
          baja el archivo <Text style={{ fontFamily: "Courier" }}>.pglitebackup</Text> a
          la PC cliente para guardarlo fuera del servidor (disco externo, nube, etc.).
        </Text>

        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 700 }}>Restaurar desde archivo: </Text>
          sube un backup y reemplaza la base de datos actual. Un archivo de bloqueo
          (lock) evita que dos restauraciones ocurran al mismo tiempo.
        </Text>

        <SectionTitle>Requisitos de red</SectionTitle>
        <Text style={styles.paragraph}>
          • La red local se considera confiable. No hay TLS.
        </Text>
        <Text style={styles.paragraph}>
          • Si el taller tiene WiFi de invitados, use WPA2 con aislamiento de clientes
          en esa red separada.
        </Text>
        <Text style={styles.paragraph}>
          • El puerto UDP 3001 debe estar abierto en el firewall de la PC servidor
          (Windows lo pide la primera vez).
        </Text>
        <Text style={styles.paragraph}>
          • Si el router aísla clientes (AP isolation), el descubrimiento falla. Desactive
          el aislamiento o conecte las PCs por cable a un switch.
        </Text>

        <SectionTitle>Desinstalación</SectionTitle>
        <NumberedItem n={1}>
          Borre los archivos <Text style={{ fontFamily: "Courier" }}>metalu-server.exe</Text>{" "}
          y <Text style={{ fontFamily: "Courier" }}>metalu-client.exe</Text>.
        </NumberedItem>
        <NumberedItem n={2}>
          Borre la carpeta <Text style={{ fontFamily: "Courier" }}>%APPDATA%\metalu\</Text>{" "}
          para eliminar la base de datos y los backups (acción irreversible).
        </NumberedItem>

        <SectionTitle>Limitaciones (versión 1)</SectionTitle>
        <Text style={styles.paragraph}>
          • Se recomiendan entre 2 y 5 PCs concurrentes (PGlite es monoescritor).
        </Text>
        <Text style={styles.paragraph}>
          • No hay HTTPS, no hay actualización automática, no hay sincronización en la
          nube.
        </Text>
        <Text style={styles.paragraph}>• Sólo Windows x64.</Text>

        <PageFooter pageNumber={3} />
      </Page>

      {/* === TROUBLESHOOTING === */}
      <Page size="A4" style={styles.page} orientation="portrait">
        <SectionTitle>Solución de problemas</SectionTitle>
        <Text style={styles.paragraph}>
          Si algo no funciona, revisá esta tabla. Si el problema persiste, anote el
          mensaje exacto de la consola del servidor y contacte al soporte.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColSymptom]}>Síntoma</Text>
            <Text style={[styles.tableHeaderText, styles.tableColCause]}>Causa probable</Text>
            <Text style={[styles.tableHeaderText, styles.tableColFix]}>Solución</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              “No se encontró servidor” en el cliente
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              Servidor apagado, o PCs en VLAN/WiFi distintas
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Verifique que la ventana de consola del servidor esté abierta y que las PCs
              compartan el mismo router.
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              Cliente se queda en “Conectando...”
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              Servidor dejó de responder durante la sesión
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Revise la consola del servidor; cierre y vuelva a abrir la ventana del
              cliente.
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              Mensaje “Disco lleno” al hacer backup
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              La unidad donde está %APPDATA% no tiene espacio
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Libere espacio en disco, o cambie la variable de entorno APPDATA antes de
              iniciar el servidor.
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              Caché desactualizada tras cambio de IP
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              El servidor renovó su IP por DHCP
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Borre el archivo{" "}
              <Text style={{ fontFamily: "Courier" }}>%APPDATA%\metalu-client\server-url.json</Text>{" "}
              y vuelva a abrir el cliente.
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              No puedo entrar con admin / admin
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              La contraseña ya fue cambiada por otro usuario
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Pida a un administrador que la resetee, o restaure un backup previo desde
              el panel /admin/backups.
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              Windows pregunta por firewall al iniciar
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              Comportamiento normal de Windows al abrir un puerto
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Marque “Permitir en redes privadas” y acepte.
            </Text>
          </View>

          <View style={styles.tableRowLast}>
            <Text style={[styles.tableCell, styles.tableColSymptom]}>
              Pantalla en blanco al abrir el cliente
            </Text>
            <Text style={[styles.tableCell, styles.tableColCause]}>
              Falta WebView2 Runtime o está desactualizado
            </Text>
            <Text style={[styles.tableCell, styles.tableColFix]}>
              Reinstale WebView2 desde el sitio oficial de Microsoft, o reinicie la PC
              tras instalar el cliente por primera vez.
            </Text>
          </View>
        </View>

        <SectionTitle>Contacto</SectionTitle>
        <Text style={styles.paragraph}>
          Ante cualquier duda técnica adicional, contacte al administrador del sistema o
          al proveedor del software. Tenga a mano la dirección IP del servidor (visible
          en <Text style={{ fontFamily: "Courier" }}>/admin/server-info</Text>) y la
          versión instalada (visible en{" "}
          <Text style={{ fontFamily: "Courier" }}>/api/version</Text>).
        </Text>

        <PageFooter pageNumber={4} />
      </Page>
    </Document>
  );
}

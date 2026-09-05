# Informe legal y tributario preliminar para operar una plataforma de preparación para el Revalida en Brasil desde una S.R.L. boliviana

**Empresa analizada:** Coding Is Giving S.R.L. (Bolivia)  
**Modelo considerado:** plataforma web de suscripción para estudiar, repasar y practicar para el examen Revalida; venta directa principalmente a personas físicas ubicadas en Brasil  
**Fecha de corte:** 2 de septiembre de 2026  
**Carácter del documento:** diagnóstico preliminar y hoja de ruta de cumplimiento; no sustituye un dictamen jurídico ni una opinión tributaria vinculante

---

## 1. Resumen ejecutivo

Coding Is Giving S.R.L. puede, en principio, vender desde Bolivia acceso a una plataforma educativa a usuarios de Brasil sin constituir inmediatamente una sociedad brasileña. Sin embargo, de ello **no** se sigue que solo deba cumplir la ley boliviana. La oferta deliberadamente dirigida a consumidores localizados en Brasil activa normas brasileñas de protección de datos, consumo, comercio electrónico e internet. Además, la reforma tributaria brasileña ha creado reglas expresas para proveedores extranjeros de servicios y bienes inmateriales consumidos en Brasil.

Las cinco conclusiones centrales son:

1. **La factura no debería tratarse automáticamente como una factura boliviana corriente.** El Servicio de Impuestos Nacionales (SIN) contempla específicamente la **Factura Comercial de Exportación de Servicios**. Antes del lanzamiento se debe habilitar y configurar ese documento fiscal y confirmar con el SIN/contador cómo emitirlo en un modelo B2C masivo donde cada suscriptor es una persona física extranjera.
2. **LGPD sí aplica aunque la empresa esté en Bolivia.** La Ley brasileña se aplica cuando se ofrecen servicios a personas ubicadas en Brasil o cuando allí se recolectan sus datos. Alojarlos en Bolivia, Estados Unidos o Europa no elimina esa aplicación.
3. **El usuario brasileño es consumidor.** El Código de Defensa del Consumidor (CDC) incluye como proveedor a una persona jurídica extranjera. Se deben ofrecer información en portugués, precio y renovación transparentes, atención electrónica, cancelación sencilla y, como postura conservadora, devolución por arrepentimiento dentro de siete días.
4. **No se debe asumir que una pasarela de pago resuelve los impuestos brasileños.** Un procesador de pagos común no es necesariamente vendedor contractual ni responsable fiscal. Debe distinguirse entre `payment processor`, marketplace/plataforma y **merchant of record**.
5. **El mayor punto abierto es el esquema IBS/CBS de Brasil.** La Ley Complementaria 214/2025 obliga al proveedor extranjero a registrarse cuando realiza operaciones en Brasil o actúa como responsable en importaciones, con reglas específicas para plataformas digitales. La transición comenzó en 2026 y los procedimientos prácticos siguen evolucionando. Esto exige una opinión tributaria brasileña antes de activar cobros recurrentes.

### Recomendación de lanzamiento

Para el piloto comercial, la ruta de menor complejidad regulatoria suele ser:

- mantener a Coding Is Giving S.R.L. como propietaria del software y del contenido;
- contratar un **merchant of record** que confirme por contrato que figura como vendedor frente al consumidor, recauda y remite los impuestos de consumo brasileños, emite el comprobante aplicable, administra contracargos y soporta reembolsos;
- emitir en Bolivia el documento de exportación que corresponda por la operación entre Coding Is Giving y ese intermediario, o por cada venta si jurídicamente Coding Is Giving continúa siendo el vendedor;
- reevaluar una subsidiaria brasileña cuando el volumen, contratación local, soporte local o alianzas B2B justifiquen el costo.

Esta recomendación es condicional: si el proveedor solo procesa tarjetas o Pix y Coding Is Giving sigue apareciendo como vendedor, **la carga fiscal y de consumo no se transfiere**.

---

## 2. Alcance y supuestos

El análisis presupone que:

- la plataforma es educativa y no diagnostica, prescribe ni atiende pacientes;
- los usuarios previstos son adultos, principalmente médicos titulados o candidatos al Revalida;
- Coding Is Giving controla producto, precios, contenido, datos y relación contractual;
- no hay, inicialmente, oficina, empleados, agentes comerciales con poder contractual ni servidores propios en Brasil;
- se cobrarán suscripciones digitales, posiblemente en reales brasileños, mediante tarjeta o Pix;
- no se venderán títulos académicos oficiales ni se afirmará tener acreditación del INEP, MEC o CFM.

Si alguno cambia, también puede cambiar la conclusión legal. En particular, tutorías clínicas individualizadas, certificaciones, contratación de docentes en Brasil, un representante que cierre contratos o una sede local elevan el riesgo regulatorio y de establecimiento empresarial.

---

## 3. Mapa de obligaciones: qué país regula qué

| Materia | Bolivia | Brasil | Conclusión operativa |
|---|---|---|---|
| Existencia y gobierno de la S.R.L. | Principal | No, salvo establecimiento local | Mantener contrato social, matrícula y representación al día en Bolivia. |
| Renta empresarial | Principal, por actividad desarrollada por la S.R.L. | Puede surgir por presencia o reglas locales específicas | Declarar la utilidad empresarial en Bolivia; revisar nexo brasileño si hay personal, oficina o agente local. |
| IVA/facturación de exportación | Principal | El comprobante boliviano no reemplaza obligaciones brasileñas | Usar el tipo de factura de exportación que confirme el SIN. |
| Impuesto al consumo de servicio digital | No agota el análisis | Relevante: IBS/CBS e importación de servicios | Diseñar el checkout con asesor brasileño o merchant of record. |
| Protección al consumidor | Puede tener incidencia residual | Principal para usuarios ubicados en Brasil | Términos, checkout, soporte, cancelación y reembolsos adaptados al CDC. |
| Datos personales | Normas bolivianas dispersas | LGPD con alcance extraterritorial | Programa de privacidad diseñado a estándar LGPD. |
| Contrato y litigios | Puede elegirse para asuntos empresariales internos | Derechos imperativos brasileños no se eliminan por contrato | No imponer foro boliviano exclusivo al consumidor brasileño. |
| Propiedad intelectual | Protección boliviana y contractual | Riesgo por uso en el mercado brasileño | Revisar marca, banco de preguntas y licencias en ambos países. |

---

## 4. Brasil: estructura empresarial y presencia local

### 4.1 ¿Hace falta crear una empresa en Brasil desde el primer día?

No necesariamente. Vender remotamente desde Bolivia no equivale por sí solo a abrir una filial física. Pero esta conclusión debe mantenerse separada de dos asuntos diferentes:

- **autorización societaria para establecerse en Brasil**, y
- **registro tributario especial de proveedor extranjero**.

El Código Civil brasileño y el DREI exigen autorización previa cuando una sociedad extranjera pretende instalar filial, agencia, sucursal o establecimiento en Brasil. El [DREI explica el procedimiento para empresas extranjeras](https://www.gov.br/empresas-e-negocios/pt-br/drei/empresas-estrangeiras), y el [Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) somete a la sociedad extranjera autorizada a las leyes y tribunales brasileños respecto de sus actos en el país.

**No debe interpretarse esto al revés:** no abrir una filial no elimina la LGPD, el CDC ni el posible registro IBS/CBS.

### 4.2 Hechos que obligan a reevaluar la presencia

Solicitar opinión brasileña antes de implementar cualquiera de estos hechos:

- oficina, cowork o dirección comercial estable en Brasil;
- contratación directa y habitual de empleados en Brasil;
- representante o agente brasileño que negocie o concluya contratos;
- equipo local de ventas o soporte que actúe como extensión permanente de la empresa;
- almacenamiento/infraestructura física propia con intervención empresarial relevante;
- sociedad local que cobre, facture o sea presentada como prestadora;
- contratos B2B relevantes con universidades, hospitales o academias brasileñas.

### 4.3 Cuándo conviene una `Ltda.` brasileña

No por “formalidad”, sino cuando aporte valor real:

- facturación local y ventas B2B;
- Pix/adquirencia y tasas de pago mejores;
- contratación de personal y profesores;
- acceso a alianzas y crédito local;
- volumen que haga más barato internalizar el cumplimiento que pagar a un merchant of record;
- reducción de fricción con reembolsos, soporte y autoridades.

Crear una entidad demasiado pronto puede duplicar contabilidad, declaraciones y costos. Crear una demasiado tarde puede dejar ventas sin la infraestructura fiscal correcta.

---

## 5. Brasil: tributación de la suscripción digital

### 5.1 Naturaleza de la operación

Una suscripción a una plataforma de estudio es, con alta probabilidad, un suministro digital de servicio o bien inmaterial consumido en Brasil. No debe clasificarse improvisadamente como “exportación de software” solo porque la empresa sea tecnológica. La clasificación depende de:

- qué recibe jurídicamente el usuario: acceso temporal, licencia, contenido, tutoría o combinación;
- quién es el vendedor contractual;
- dónde se considera consumido el servicio;
- quién cobra y emite el comprobante;
- si existe un intermediario que asume responsabilidad fiscal.

### 5.2 Reforma IBS/CBS

La [Ley Complementaria 214/2025](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm) instituyó el IBS y la CBS y regula expresamente las operaciones con proveedores extranjeros. Entre los puntos relevantes:

- el suministro por un residente en el exterior cuyo consumo ocurre en Brasil se trata como importación de servicio o bien inmaterial;
- el proveedor extranjero puede quedar obligado a registrarse como contribuyente o responsable;
- el adquirente/destinatario brasileño puede ser contribuyente de la importación, aun sin inscripción;
- el proveedor extranjero puede responder solidariamente;
- una plataforma digital que intermedia y controla elementos esenciales puede ser responsable del pago;
- si el proveedor vende exclusivamente mediante una plataforma digital debidamente inscrita, la ley contempla supuestos de dispensa de inscripción del proveedor.

La [orientación oficial para 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026) confirma que 2026 es el inicio operativo de obligaciones y documentos de la transición. El reglamento de la CBS publicado mediante el [Decreto 12.955/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm) reitera que el consumo en Brasil de servicios suministrados por un residente en el exterior constituye importación.

**Implicación práctica:** no es prudente abrir checkout directo a Brasil asumiendo que el comprador individual “se ocupa del impuesto”. La ley diseña mecanismos para alcanzar al proveedor extranjero, la plataforma o el flujo de pago.

### 5.3 Régimen anterior y transición

Durante la transición pueden convivir reglas anteriores —ISS-importación, PIS/Cofins-importación y, según naturaleza/pagador, retenciones o CIDE— con IBS/CBS. Su aplicación no puede resolverse solo con la etiqueta “SaaS”. En B2C, además, el funcionamiento práctico de remesas con tarjeta/Pix difiere del contrato B2B tradicional.

El asesor brasileño debe responder por escrito:

1. clasificación exacta del producto;
2. tributos vigentes en cada año de transición;
3. sujeto responsable en venta directa B2C;
4. necesidad y procedimiento de inscripción de Coding Is Giving;
5. documento fiscal brasileño aplicable;
6. tratamiento cuando cobra tarjeta extranjera, adquirente brasileño o Pix;
7. si el intermediario elegido califica como plataforma responsable bajo la LC 214 o solo como procesador.

### 5.4 Tres modelos de cobro

| Modelo | Quién aparece como vendedor | Riesgo para Coding Is Giving | Evaluación |
|---|---|---|---|
| Pasarela de pago | Coding Is Giving | Sigue siendo responsable de términos, consumidor y, normalmente, estructura fiscal | Barato, pero no simplifica cumplimiento por sí solo. |
| Marketplace/plataforma | Depende del contrato y del control de la operación | Puede asumir ciertos impuestos, pero no necesariamente toda la relación | Requiere revisar contrato y comprobante real. |
| Merchant of record | El intermediario, si el contrato y checkout lo reflejan de verdad | Reduce carga de impuesto indirecto, facturación, fraude y reembolso; no elimina LGPD ni obligaciones propias | Preferible para piloto si cubre Brasil expresamente. |

No aceptar una afirmación comercial del proveedor como prueba. Exigir cláusulas sobre Brasil, IBS/CBS, comprobantes, impuestos, reembolsos, contracargos, datos y responsabilidad.

---

## 6. Brasil: Código de Defensa del Consumidor y comercio electrónico

### 6.1 Aplicación al proveedor extranjero

El [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) define proveedor incluyendo a personas jurídicas extranjeras y exige información clara, oferta veraz y responsabilidad por defectos o información insuficiente. Una cláusula que diga “solo se aplica la ley boliviana” no neutraliza derechos imperativos del consumidor brasileño.

### 6.2 Información obligatoria en el sitio

El [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm) exige, de forma destacada y fácil de encontrar:

- nombre empresarial completo: Coding Is Giving S.R.L.;
- número de registro aplicable (NIT boliviano y, si se obtiene, registro brasileño);
- dirección física y electrónica y medios de contacto;
- características esenciales y restricciones del servicio;
- precio total y gastos adicionales;
- condiciones de pago, disponibilidad y ejecución;
- resumen del contrato antes de aceptar;
- posibilidad de corregir errores antes de pagar;
- confirmación inmediata de la contratación;
- copia conservable/reproducible del contrato;
- canal electrónico para dudas, reclamaciones, suspensión y cancelación;
- respuesta a la demanda del consumidor en un máximo de cinco días;
- seguridad eficaz en pagos y tratamiento de datos.

Todo lo sustancial debe estar en **portugués claro**. Puede añadirse español, pero no reemplazar el portugués.

### 6.3 Derecho de arrepentimiento

El artículo 49 del CDC concede siete días en contrataciones realizadas fuera del establecimiento, y el Decreto 7.962 exige que el desistimiento pueda ejercerse por la misma herramienta usada para contratar, con comunicación al medio de pago y confirmación inmediata.

Para un piloto, la política conservadora es:

- permitir desistimiento dentro de siete días desde la contratación;
- reintegrar el importe completo, sin penalidad;
- ofrecer el mecanismo dentro de la cuenta y por correo;
- conservar evidencia de solicitud, confirmación y reembolso.

No conviene copiar una renuncia europea por “contenido digital iniciado inmediatamente”; Brasil no contiene una excepción general equivalente que deba asumirse válida para esta suscripción.

### 6.4 Suscripción y renovación

Antes del pago, mostrar sin ambigüedad:

- precio en BRL y periodicidad;
- si es prueba gratis, fecha y monto del primer cobro;
- renovación automática;
- forma de cancelar y efecto de la cancelación;
- política de reembolso;
- alcance del acceso después de cancelar;
- impuestos o cargos incluidos;
- ausencia de garantía de aprobación del Revalida.

La cancelación debe ser tan accesible como la contratación. Las cláusulas abusivas, cambios unilaterales amplios, arbitraje obligatorio o exclusión absoluta de responsabilidad pueden ser nulos bajo el CDC.

### 6.5 Publicidad y promesas

Evitar expresiones como:

- “aprobación garantizada”;
- “curso oficial del Revalida”;
- “avalado por INEP/MEC/CFM”, salvo autorización demostrable;
- tasas de aprobación sin metodología y evidencia;
- urgencia o escasez artificial;
- testimonios falsos o resultados atípicos presentados como normales.

La oferta publicitaria suficientemente precisa integra el contrato. El descargo “resultados pueden variar” no corrige una afirmación principal engañosa.

---

## 7. Brasil: LGPD y Marco Civil de Internet

### 7.1 Por qué aplica

El artículo 3 de la [LGPD, Ley 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), aplica con independencia del país de sede cuando el tratamiento busca ofrecer bienes o servicios a personas ubicadas en Brasil o cuando los datos se recolectan allí. Coding Is Giving será normalmente **controlador** respecto de cuentas, progreso, marketing, pagos y analítica; proveedores de nube, correo y soporte serán operadores o controladores independientes según su función.

### 7.2 ¿Los datos de estudio son datos de salud?

No automáticamente. Ser médico, estudiar una especialidad o responder una pregunta clínica no convierte todo el perfil en dato sensible. Pero sí puede haber datos sensibles si el usuario revela:

- estado de salud propio;
- discapacidad o adaptaciones;
- origen racial/étnico;
- biometría;
- información de pacientes o casos reales identificables.

La plataforma debe prohibir subir información identificable de pacientes y diseñar campos abiertos para desalentarla. Si se usan casos clínicos, deben ser ficticios o efectivamente anonimizados.

### 7.3 Inventario y bases legales

Crear un registro por finalidad, no una autorización genérica:

| Tratamiento | Base probable | Observación |
|---|---|---|
| Crear cuenta y prestar el servicio | Ejecución del contrato | Recoger solo lo necesario. |
| Cobro, contabilidad y antifraude | Contrato, obligación legal y/o interés legítimo según operación | No almacenar tarjeta completa; delegarla en proveedor certificado. |
| Progreso, respuestas y recomendaciones | Contrato; interés legítimo sujeto a evaluación | Explicar perfilado y permitir revisión/objeción cuando corresponda. |
| Correos transaccionales | Contrato | Separarlos del marketing. |
| Marketing por correo/WhatsApp | Consentimiento suele ser la opción más segura | Opt-in no premarcado y baja sencilla. |
| Cookies esenciales | Ejecución/legítimo interés, según finalidad | No deben bloquearse si son indispensables. |
| Analítica/publicidad no esencial | Consentimiento granular como postura conservadora | No cargar etiquetas antes de decidir. |
| Datos sensibles eventuales | Solo hipótesis del art. 11 | Evitar recolectarlos si no son imprescindibles. |

### 7.4 Documentación mínima

- aviso de privacidad en portugués;
- política de cookies y gestor de consentimiento;
- registro de operaciones de tratamiento;
- matriz de bases legales y retención;
- contratos/DPA con operadores;
- procedimiento para derechos del titular;
- evaluación de interés legítimo cuando se use;
- evaluación de impacto para tratamientos de alto riesgo;
- plan de respuesta a incidentes;
- registro de incidentes y solicitudes;
- controles de acceso, cifrado, copias de seguridad, logs y revisión de permisos.

### 7.5 Derechos del titular

Habilitar un canal en portugués para confirmación, acceso, corrección, anonimización/bloqueo/eliminación, portabilidad cuando esté regulada, información sobre compartición, revocación del consentimiento, oposición y revisión de decisiones automatizadas en los supuestos legales.

La interfaz debe permitir, al menos, descargar información básica, corregir perfil, retirar marketing y solicitar cierre/eliminación. El cierre no significa borrar inmediatamente lo que deba conservarse por obligación fiscal, fraude o defensa de derechos; esas excepciones deben documentarse.

### 7.6 Encargado y representación

La LGPD exige un `encarregado` como canal con titulares y ANPD. La [Resolución CD/ANPD 2/2022](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022) permite que agentes de pequeño porte estén dispensados, pero deben mantener un canal y la excepción no ampara tratamientos de alto riesgo en todos los casos.

No se debe asumir que una S.R.L. boliviana califica automáticamente por ser pequeña. Designar voluntariamente una persona/canal responsable suele ser más simple que discutir la excepción. La necesidad de un representante situado en Brasil debe ser confirmada con abogado brasileño según la estructura y normativa vigente; no debe confundirse con el encargado de privacidad.

### 7.7 Transferencia internacional

Si la información sale de Brasil hacia Bolivia o proveedores en otros países, mapear exportador, importador, finalidad y subencargados. La [Resolución CD/ANPD 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024) aprobó el régimen de transferencias internacionales y cláusulas contractuales estándar.

Acciones:

- comprobar si existe decisión de adecuación aplicable; no presumir que Bolivia la tiene;
- incorporar cláusulas estándar de ANPD o usar otra base válida;
- alinear contratos con nube, analítica, correo, soporte e IA;
- informar países/categorías de destinatarios y mecanismo de transferencia;
- impedir que proveedores incorporen datos de usuarios a entrenamiento general sin base y transparencia adecuadas.

### 7.8 Cookies

Seguir la [guía de cookies de la ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/%40%40display-file/file): botón igualmente visible para aceptar y rechazar no esenciales, categorías granulares, posibilidad de cambiar preferencias y ausencia de casillas premarcadas.

### 7.9 Incidentes

La política interna debe identificar, contener, preservar evidencia, evaluar riesgo y escalar inmediatamente. La regulación de ANPD establece plazos breves para incidentes con riesgo o daño relevante; por seguridad operativa, diseñar el proceso para una decisión de notificación dentro de **tres días hábiles**, sin esperar a tener toda la investigación cerrada.

### 7.10 Marco Civil

El [Marco Civil de Internet, Ley 12.965/2014](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm), exige claridad sobre recolección, uso, almacenamiento y protección, reconoce eliminación al terminar la relación con las salvedades legales y considera nula una cláusula de adhesión que no ofrezca el foro brasileño como alternativa para servicios prestados en Brasil.

Para proveedores de aplicaciones con actividad organizada y fines económicos, revisar además la obligación de conservar **registros de acceso a la aplicación** durante seis meses bajo medidas de seguridad y confidencialidad. No confundir estos logs con el contenido de comunicaciones ni conservar todo indefinidamente.

---

## 8. Brasil: contenido médico, Revalida, marca y derechos de autor

### 8.1 Delimitar el producto

La plataforma debe presentarse como preparación educativa. Incluir en términos y páginas relevantes:

- no presta consulta, diagnóstico ni tratamiento;
- no sustituye protocolos oficiales ni juicio clínico;
- no garantiza aprobación ni revalidación del diploma;
- no está afiliada a INEP, MEC, CFM ni universidades participantes, salvo convenio escrito;
- el contenido debe contrastarse con fuentes clínicas actuales.

Un descargo no permite ofrecer en la práctica telemedicina. Si se responden casos personales, se orienta sobre pacientes reales o se individualizan decisiones clínicas, solicitar revisión sanitaria y profesional separada.

### 8.2 Uso del nombre “Revalida”

Puede ser necesario usar el nombre de forma descriptiva para explicar el propósito del curso, pero no debe usarse con apariencia de origen oficial. Antes de fijar marca/dominio:

- buscar registros en INPI Brasil;
- evitar logotipos, tipografía o identidad institucional del INEP/MEC;
- usar fórmula visible “plataforma independiente, sin afiliación con INEP/MEC”;
- registrar la marca propia en las clases pertinentes.

La [Ley de Propiedad Industrial 9.279/1996](https://www.planalto.gov.br/ccivil_03/leis/l9279.htm) protege marcas y reprime competencia desleal.

### 8.3 Preguntas de exámenes y materiales

Que una prueba esté publicada en un portal gubernamental no significa que todo uso comercial, adaptación o compilación sea automáticamente libre. La [Ley de Derechos de Autor 9.610/1998](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm) excluye ciertos actos oficiales, pero las preguntas, imágenes, textos de terceros y la selección/organización pueden exigir análisis específico.

Política recomendada:

- crear banco original de preguntas;
- documentar autoría y cesión/licencia de redactores;
- citar fuentes clínicas sin copiar extensamente;
- verificar licencias de imágenes, tablas y fragmentos;
- separar claramente preguntas oficiales reproducidas con base jurídica de simulaciones propias;
- implementar canal de retirada por propiedad intelectual.

### 8.4 IA generativa

Si se generan explicaciones con IA:

- revisión humana clínica antes de publicación;
- versionado, fuente y fecha de revisión;
- no enviar datos personales/sensibles a modelos sin contrato y base legal;
- advertir límites de explicación cuando corresponda;
- canal para reportar error médico;
- no inventar bibliografía ni guías.

El mayor riesgo no es que el texto “lo hizo una IA”, sino publicar material clínicamente incorrecto bajo una oferta que promete preparación profesional.

---

## 9. Bolivia: qué significa que una S.R.L. opere en el extranjero

### 9.1 No es una transformación societaria automática

Una S.R.L. boliviana puede celebrar contratos y exportar servicios. Vender a residentes extranjeros no la convierte automáticamente en sociedad brasileña ni exige crear otra empresa en Bolivia. Debe, sin embargo:

- comprobar que el objeto social cubre desarrollo/comercialización de software, servicios digitales y contenido educativo;
- mantener matrícula de comercio, NIT, domicilio y representación actualizados;
- registrar ingresos y costos en contabilidad boliviana;
- respaldar contrato/aceptación, pago, factura, tipo de cambio y prestación;
- cumplir reglas cambiarias, bancarias y de prevención de legitimación que aplique la entidad financiera;
- evaluar el registro o modificación de actividad económica si hoy solo consta programación y el negocio incluye educación/contenido por suscripción.

La actividad principal “Actividades de Programación Informática” ayuda, pero **no prueba por sí sola** que toda explotación de contenido educativo esté correctamente declarada. Revisar actividades secundarias en SIN y SEPREC.

### 9.2 ¿Factura normal al usuario brasileño?

**Respuesta corta: no debe asumirse que corresponde una factura doméstica normal.** El SIN publica un tipo específico denominado [Factura Comercial de Exportación de Servicios](https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/archivos-xml-xsd-de-facturas-electronicas/factura-comercial-de-exportacion-de-servicios), habilitado para transacciones de exportación de servicios. También reconoce en sus [tipos de documentos fiscales](https://siatinfo.impuestos.gob.bo/index.php/informacion/tipos-facturas) documentos comerciales de exportación.

La aplicación correcta exige confirmar cuatro cosas:

1. que el acceso digital califica como exportación de servicios y no como servicio utilizado/explotado en Bolivia;
2. quién es el cliente fiscal: cada usuario brasileño o el merchant of record;
3. cómo registrar nombre/documento extranjero cuando el comprador no tiene NIT/CI boliviano;
4. moneda, tipo de cambio, fecha de emisión y respaldo del ingreso.

Si hay venta directa, el usuario brasileño es el adquirente y debería recibir el comprobante correspondiente. Si un merchant of record compra/revende el servicio o actúa como contraparte contractual, puede haber una operación de exportación consolidada frente a ese intermediario; esto depende del contrato real, no del nombre comercial del proveedor.

### 9.3 IVA

El [SIN informa](https://siatinfo.impuestos.gob.bo/index.php/impuesto-asunto/iva-it-e-iue) que las exportaciones están liberadas del IVA conforme al artículo 11 de la Ley 843 y que se emite factura comercial de exportación sin derecho a crédito fiscal para el comprador. Existe, no obstante, una diferencia entre:

- que exista documento de exportación de servicios, y
- que cada modalidad digital cumpla los requisitos sustantivos para el tratamiento de exportación.

Por eso no debe programarse IVA 0% solo por detectar una IP brasileña. Debe existir evidencia de cliente exterior, consumo/beneficio exterior, pago y naturaleza del servicio.

### 9.4 IT e IUE

La exportación no vuelve exenta toda la renta empresarial:

- **IUE:** la utilidad atribuible a la actividad de la empresa boliviana debe considerarse en su liquidación anual. La tasa general empresarial debe validarse con el contador en el régimen vigente (históricamente 25%).
- **IT:** puede gravar ingresos brutos por actividades realizadas en Bolivia (históricamente 3%), con mecanismos de compensación con IUE pagado. La liberación de IVA no implica automáticamente exención de IT.

La determinación exacta debe basarse en la versión vigente de la [Ley 843 y decretos reglamentarios publicados por el SIN](https://www.impuestos.gob.bo/), no en una regla informal de “todo lo exportado es tasa cero”.

### 9.5 Cobro en moneda extranjera

El SIN indica que las facturas comerciales de exportación pueden registrar importes en bolivianos o su equivalente en moneda extranjera usando el tipo de cambio oficial correspondiente. Conservar:

- reporte de la pasarela con importe bruto, impuesto, comisión, reembolso y neto;
- extracto bancario;
- tipo de cambio aplicado;
- conciliación factura-pago;
- contrato y términos aceptados;
- país y datos razonables del comprador, sin recolectar más de lo necesario.

No contabilizar únicamente el neto depositado: las comisiones y retenciones suelen requerir registro separado del ingreso bruto.

### 9.6 Aduana

Una exportación puramente digital no implica despacho físico de mercancía. No debe tramitarse como exportación aduanera de bienes solo por llamarse “exportación”. Si se venden libros, kits u otros bienes físicos, nace un flujo aduanero distinto.

### 9.7 Doble imposición

No se identificó en las fuentes oficiales consultadas un convenio integral vigente Bolivia–Brasil para evitar la doble imposición sobre renta que resuelva automáticamente este caso. Este punto debe confirmarse formalmente antes de depender de crédito fiscal o de una regla de establecimiento permanente basada en tratado. La ausencia de convenio haría más importante estructurar y documentar correctamente cualquier impuesto retenido en Brasil.

---

## 10. Bolivia: privacidad y contratos

Bolivia no debe tratarse como un vacío normativo, aunque no tenga un régimen general equivalente a la LGPD. Existen garantías constitucionales de privacidad, intimidad y protección mediante acción de protección de privacidad, además de deberes civiles, contractuales, de telecomunicaciones y posibles consecuencias penales por acceso o revelación indebidos.

En este proyecto, aplicar LGPD como estándar operativo global es más eficiente que mantener un estándar inferior para infraestructura boliviana. Además:

- contratos con empleados y proveedores deben incluir confidencialidad y seguridad;
- accesos administrativos deben quedar registrados;
- prohibir uso personal de bases de datos;
- definir propiedad del código y del contenido creado por socios, contratistas y docentes;
- respaldar internacionalmente los contratos y pagos.

---

## 11. Documentos que deben prepararse antes de cobrar

### Públicos, en portugués

1. **Termos de Uso e Assinatura**.
2. **Política de Privacidade**.
3. **Política de Cookies** y panel de preferencias.
4. **Política de Cancelamento, Arrependimento e Reembolso**.
5. **Aviso de plataforma independente** respecto de INEP/MEC/CFM.
6. Información del proveedor y contacto en footer/checkout.
7. Avisos sobre contenido educativo y ausencia de garantía de aprobación.

### Internos

1. registro de tratamientos y proveedores;
2. política de retención/eliminación;
3. plan de incidentes;
4. procedimiento de derechos LGPD;
5. contratos de tratamiento y transferencia internacional;
6. matriz de permisos y seguridad;
7. expediente de propiedad intelectual de cada contenido;
8. procedimiento de revisión médica;
9. expediente tributario del flujo de venta y facturación;
10. conciliación de pagos, impuestos, comisiones y reembolsos.

### Evidencia de aceptación

Guardar versión de términos/políticas, fecha/hora, usuario, acción afirmativa, precio, plan, renovación, recibo y confirmación enviada. No usar una única casilla para aceptar marketing y contrato.

---

## 12. Checklist técnico de cumplimiento

### Checkout

- [ ] Precio final en BRL, periodicidad y renovación visibles antes de pagar.
- [ ] Identidad legal completa del vendedor real.
- [ ] Enlace a términos y resumen contractual.
- [ ] Casilla de aceptación no premarcada.
- [ ] Consentimiento de marketing separado.
- [ ] Corrección de errores antes de confirmar.
- [ ] Confirmación y copia del contrato por correo.
- [ ] Documento fiscal/recibo definido para Brasil y Bolivia.

### Cuenta y suscripción

- [ ] Botón de cancelación dentro de la cuenta.
- [ ] Flujo de arrepentimiento de siete días.
- [ ] Historial de pagos y plan.
- [ ] Exportación/corrección/eliminación de datos o canal efectivo.
- [ ] Aviso antes de cambios materiales de precio o términos.

### Datos y seguridad

- [ ] MFA para administradores.
- [ ] RBAC y mínimo privilegio.
- [ ] Cifrado en tránsito y reposo.
- [ ] Secretos fuera del repositorio.
- [ ] Logs de administración y acceso definidos con retención.
- [ ] Backups cifrados y restauración probada.
- [ ] Inventario de subprocesadores y países.
- [ ] DPA y cláusulas de transferencia.
- [ ] Escaneo de vulnerabilidades y proceso de parches.
- [ ] Plan de incidentes probado.
- [ ] Prohibición y filtros razonables para datos de pacientes.

### Contenido

- [ ] Autor/licencia acreditados por recurso.
- [ ] Revisión clínica y fecha.
- [ ] Fuente y versión de guías.
- [ ] Canal para reportar errores.
- [ ] Sin promesas de aprobación ni afiliación oficial.
- [ ] Revisión de marca en Brasil y Bolivia.

---

## 13. Plan de acción recomendado

### Fase 0 — antes de cualquier cobro (bloqueante)

1. Dibujar el flujo contractual y de dinero: usuario → checkout → procesador/MoR → banco → Coding Is Giving.
2. Decidir quién será vendedor contractual.
3. Obtener opinión breve de tributarista brasileño sobre LC 214/2025, CBS/IBS y documentos 2026–2027.
4. Obtener confirmación escrita del contador/SIN sobre Factura Comercial de Exportación de Servicios, IVA, IT, IUE y emisión B2C.
5. Revisar objeto social y actividades registradas.
6. Preparar términos, privacidad, cookies, cancelación y reembolso en portugués jurídico claro.
7. Auditar origen/licencias del banco de preguntas.

### Fase 1 — piloto limitado

1. Preferir merchant of record con cobertura contractual expresa de Brasil.
2. Limitar marketing y cookies no esenciales.
3. Implementar reembolso de siete días y soporte en portugués.
4. Mantener métricas de ventas por estado/municipio, impuestos, reembolsos y contracargos.
5. No contratar personal ni abrir dirección local sin reevaluación.

### Fase 2 — después de validar demanda

Revisar al alcanzar cualquiera de estos disparadores:

- ventas sostenidas que hagan costosa la comisión del MoR;
- alianzas B2B que exijan nota fiscal brasileña;
- contratación local;
- volumen significativo de solicitudes LGPD o soporte;
- campañas con afiliados/agentes brasileños;
- cambios en reglas operativas IBS/CBS.

Comparar costo total de: proveedor extranjero registrado, filial autorizada o subsidiaria `Ltda.` brasileña.

### Fase 3 — escala

- responsable formal de privacidad y compliance;
- auditorías de proveedores y seguridad;
- evaluación de impacto para perfilado/IA avanzada;
- entidad brasileña si la sustancia operativa ya está en Brasil;
- revisión anual tributaria y de contenidos clínicos.

---

## 14. Preguntas cerradas para los asesores

### Contador/abogado tributario en Bolivia

1. ¿La suscripción descrita califica como exportación de servicios para IVA?
2. ¿Debemos habilitar Factura Comercial de Exportación de Servicios en SIAT?
3. ¿Se emite por cada persona física o al merchant of record?
4. ¿Qué documento/dato se usa para un usuario brasileño sin NIT boliviano?
5. ¿Cómo se declaran moneda y tipo de cambio?
6. ¿La operación paga IT? ¿Cómo se compensa IUE?
7. ¿Qué actividad secundaria debe agregarse por contenido educativo/SaaS?
8. ¿Cómo registrar comisión, retención, impuesto extranjero, contracargo y reembolso?

### Tributarista en Brasil

1. ¿La plataforma es servicio, bien inmaterial, licencia o suministro mixto para LC 214?
2. ¿Coding Is Giving debe inscribirse bajo IBS/CBS en venta directa B2C en 2026/2027?
3. ¿Qué obligación asume el adquirente y cuál el proveedor extranjero?
4. ¿El proveedor de checkout elegido es plataforma responsable o simple procesador?
5. ¿Qué comprobante recibe el consumidor?
6. ¿Cómo conviven ISS/PIS-Cofins-importación y CBS/IBS durante transición?
7. ¿Una retención brasileña es probable en tarjeta/Pix B2C?
8. ¿Hay obligación de representante local y para cuál registro?

### Abogado de consumo/privacidad en Brasil

1. ¿Los términos y flujos cumplen CDC y Decreto 7.962?
2. ¿La política de siete días está correctamente implementada?
3. ¿La estructura requiere encargado o representante en Brasil?
4. ¿Qué mecanismo de transferencia internacional se usará hacia Bolivia y subprocesadores?
5. ¿Qué logs deben conservarse seis meses bajo Marco Civil?
6. ¿El uso descriptivo de “Revalida” y las preguntas históricas es defendible?

---

## 15. Matriz de riesgo inicial

| Riesgo | Nivel | Por qué | Mitigación inmediata |
|---|---:|---|---|
| Lanzar con pasarela común creyendo que liquida impuestos | Alto | La LC 214 alcanza a proveedor extranjero/plataforma y está en transición | MoR real u opinión brasileña y registro. |
| Emitir factura doméstica boliviana por defecto | Alto | Existe documento específico de exportación de servicios | Confirmar habilitación y flujo SIAT. |
| Checkout sin arrepentimiento/cancelación sencilla | Alto | Derecho expreso del CDC y Decreto 7.962 | Flujo de siete días y autoservicio. |
| Transferir datos a Bolivia/nube sin mecanismo LGPD | Alto | Transferencia internacional regulada | Mapa, DPA y cláusulas ANPD. |
| Copiar preguntas/material clínico sin expediente de derechos | Alto | Riesgo autoral y reputacional | Banco original y revisión de licencias. |
| Presentarse como curso oficial | Alto | Publicidad engañosa y marca | Disclaimer y diseño independiente. |
| No tener entidad brasileña en el piloto | Medio-bajo por sí solo | La venta remota no equivale necesariamente a filial | Vigilar hechos de presencia y registro fiscal especial. |
| No nombrar encargado formal | Medio | Puede existir excepción de pequeño porte, pero no automática | Canal público y designación voluntaria. |
| Guardar todo indefinidamente | Medio-alto | Viola necesidad/retención y aumenta impacto de incidentes | Calendario de eliminación. |

---

## 16. Conclusión

La estrategia jurídicamente razonable no es “abrir una empresa brasileña antes de validar”, pero tampoco “vender desde Bolivia y aplicar solo reglas bolivianas”. El punto medio correcto es una exportación formalmente documentada desde la S.R.L., un checkout diseñado para el consumidor brasileño, cumplimiento LGPD desde el producto y una solución explícita para IBS/CBS.

La respuesta a la pregunta concreta sobre factura es: **probablemente corresponde la Factura Comercial de Exportación de Servicios, no una factura doméstica normal**, pero debe validarse la calificación del suministro, la contraparte y el modo B2C con SIN/contador antes de automatizarla. Y aunque Bolivia libere la exportación del IVA, ello no elimina IUE/posible IT ni los impuestos de consumo que Brasil pueda exigir.

El orden correcto es: **definir vendedor y flujo de dinero → obtener criterio tributario Brasil/Bolivia → configurar factura y checkout → publicar documentos legales → cobrar**. Cambiar ese orden crea deuda legal difícil de corregir después.

---

## 17. Fuentes oficiales principales

### Brasil

- [Lei 13.709/2018 — Lei Geral de Proteção de Dados (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Resolução CD/ANPD 2/2022 — agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [Resolução CD/ANPD 19/2024 — transferência internacional](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [Guia orientativo de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/%40%40display-file/file)
- [Lei 8.078/1990 — Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [Decreto 7.962/2013 — comércio eletrônico](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)
- [Lei 12.965/2014 — Marco Civil da Internet](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- [Lei Complementar 214/2025 — IBS e CBS](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [Decreto 12.955/2026 — regulamento da CBS](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm)
- [Orientações oficiais da reforma tributária para 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026)
- [DREI — filiais de empresas estrangeiras](https://www.gov.br/empresas-e-negocios/pt-br/drei/empresas-estrangeiras)
- [Lei 10.406/2002 — Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)
- [Lei 9.279/1996 — propriedade industrial](https://www.planalto.gov.br/ccivil_03/leis/l9279.htm)
- [Lei 9.610/1998 — direitos autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)

### Bolivia

- [SIN — Factura Comercial de Exportación de Servicios](https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/archivos-xml-xsd-de-facturas-electronicas/factura-comercial-de-exportacion-de-servicios)
- [SIN — tipos de documentos fiscales](https://siatinfo.impuestos.gob.bo/index.php/informacion/tipos-facturas)
- [SIN — orientación IVA, IT e IUE](https://siatinfo.impuestos.gob.bo/index.php/impuesto-asunto/iva-it-e-iue)
- [SIN — obligaciones tributarias](https://siatinfo.impuestos.gob.bo/index.php/obligaciones-tributarias)
- [Servicio de Impuestos Nacionales — normativa y Ley 843 actualizada](https://www.impuestos.gob.bo/)

---

> **Advertencia profesional:** las conclusiones tributarias brasileñas requieren actualización continua durante la transición IBS/CBS. Entregar este informe a un contador boliviano y a un tributarista brasileño junto con el contrato de la pasarela/MoR, capturas del checkout y un diagrama del flujo de dinero permitirá convertirlo en una implementación concreta.
